import { createHash, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ACCESS_TOKEN_TTL,
  ACCESS_TOKEN_TTL_SECONDS,
  BCRYPT_SALT_ROUNDS,
  CONFIG_KEYS,
  REFRESH_TOKEN_TTL,
  REFRESH_TOKEN_TTL_DAYS,
  ResourceType,
} from '../../common/constants';
import {
  EmailAlreadyRegisteredException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
  InvalidResetCodeException,
  ResourceNotFoundException,
  WrongPasswordException,
} from '../../common/exceptions';
import type { JwtPayload } from '../../common/interfaces';
import { requireConfigValue } from '../../config';
import { InvitationsService } from '../invitations/invitations.service';
import { Member } from '../members/entities/member.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { toUserResponse } from '../users/mappers/user.mapper';
import type { UserResponseDto } from '../users/dtos/user-response.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dtos/account.dto';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import type { AuthTokens } from './interfaces/auth-tokens.interface';
import type { IAuthService } from './interfaces/auth-service.interface';
import { MailService } from './mail.service';

const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;
const RESET_MAX_PER_HOUR = 3;

/** Stored instead of the raw JWT: a database leak must not yield usable sessions. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService implements IAuthService {
  private readonly jwtSecret: string;
  private readonly refreshTokenSecret: string;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepository: Repository<PasswordResetToken>,
    private readonly invitationsService: InvitationsService,
    private readonly mailService: MailService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.jwtSecret = requireConfigValue(configService, CONFIG_KEYS.JWT_SECRET);
    this.refreshTokenSecret = requireConfigValue(configService, CONFIG_KEYS.REFRESH_TOKEN_SECRET);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, inviteCode } = registerDto;

    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new EmailAlreadyRegisteredException(email);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // members.userId is NOT NULL UNIQUE, so every account is also a church
    // member. The rows are written together — a user without its member row can
    // never be scheduled — and spending the invitation is part of the same
    // transaction, so a failed sign-up never burns a code.
    const user = await this.dataSource.transaction(async (manager) => {
      const invitation = await this.invitationsService.consume(manager, inviteCode);
      const churchId = invitation.churchId;

      const created = await manager.save(
        manager.create(User, { email, passwordHash, name, churchId }),
      );

      const member = await manager.save(
        manager.create(Member, { userId: created.id, churchId, fullName: name }),
      );

      if (invitation.teamId) {
        await manager.save(
          manager.create(TeamMember, { teamId: invitation.teamId, memberId: member.id }),
        );
      }

      return created;
    });

    const tokens = await this.generateTokens(user);
    return { user: toUserResponse(user), ...tokens };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    user.lastLoginAt = new Date();
    await this.usersRepository.update(user.id, { lastLoginAt: user.lastLoginAt });

    const tokens = await this.generateTokens(user);
    return { user: toUserResponse(user), ...tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(refreshToken);

    const storedToken = await this.refreshTokensRepository.findOne({
      where: { tokenHash: hashToken(refreshToken), userId: payload.sub },
      relations: { user: true },
    });

    if (!storedToken || storedToken.revokedAt) {
      throw new InvalidRefreshTokenException();
    }

    if (new Date() > storedToken.expiresAt) {
      throw new InvalidRefreshTokenException('Refresh token expirado');
    }

    // Rotation: the presented token is spent, so a stolen copy cannot be reused.
    await this.refreshTokensRepository.update(storedToken.id, { revokedAt: new Date() });

    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokensRepository.update({ userId }, { revokedAt: new Date() });
  }

  async me(userId: string): Promise<UserResponseDto> {
    return toUserResponse(await this.findUser(userId));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.findUser(userId);

    await this.dataSource.transaction(async (manager) => {
      if (dto.name !== undefined) user.name = dto.name;
      if (dto.phone !== undefined) user.phone = dto.phone;
      await manager.save(user);

      // The roster shows the member's name, so it follows the account's.
      if (dto.name !== undefined) await manager.update(Member, { userId }, { fullName: dto.name });
    });

    return toUserResponse(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<AuthTokens> {
    const user = await this.findUser(userId);

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new WrongPasswordException();
    }

    await this.setPassword(user, dto.newPassword);
    return this.generateTokens(user);
  }

  async forgotPassword({ email }: ForgotPasswordDto): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) return;

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.resetTokensRepository.count({
      where: { userId: user.id, createdAt: MoreThan(lastHour) },
    });
    if (recent >= RESET_MAX_PER_HOUR) return;

    const code = `${randomInt(1_000_000)}`.padStart(6, '0');

    // Only the newest code is valid.
    await this.resetTokensRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    await this.resetTokensRepository.save(
      this.resetTokensRepository.create({
        userId: user.id,
        codeHash: hashToken(`${user.id}:${code}`),
        expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
      }),
    );

    await this.mailService.send(
      user.email,
      'Seu código para redefinir a senha',
      `Seu código é ${code}. Ele vale por 15 minutos. Se não foi você, ignore este e-mail.`,
    );
  }

  async resetPassword({ email, code, newPassword }: ResetPasswordDto): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    const token = user
      ? await this.resetTokensRepository.findOne({
          where: { userId: user.id, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
          order: { createdAt: 'DESC' },
        })
      : null;

    if (!user || !token || token.attempts >= RESET_MAX_ATTEMPTS) {
      throw new InvalidResetCodeException();
    }

    if (token.codeHash !== hashToken(`${user.id}:${code}`)) {
      await this.resetTokensRepository.increment({ id: token.id }, 'attempts', 1);
      throw new InvalidResetCodeException();
    }

    token.usedAt = new Date();
    await this.resetTokensRepository.save(token);
    await this.setPassword(user, newPassword);
  }

  /** New hash, and every session signed in with the old password is ended. */
  private async setPassword(user: User, password: string): Promise<void> {
    user.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await this.usersRepository.save(user);
    await this.refreshTokensRepository.update({ userId: user.id }, { revokedAt: new Date() });
  }

  private async findUser(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new ResourceNotFoundException(ResourceType.USER, id);
    return user;
  }

  private verifyRefreshToken(refreshToken: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.refreshTokenSecret,
      });
    } catch {
      throw new InvalidRefreshTokenException();
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: REFRESH_TOKEN_TTL,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      }),
    );

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }
}
