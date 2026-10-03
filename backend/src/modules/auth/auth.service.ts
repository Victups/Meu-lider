import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ACCESS_TOKEN_TTL,
  ACCESS_TOKEN_TTL_SECONDS,
  BCRYPT_SALT_ROUNDS,
  CONFIG_KEYS,
  REFRESH_TOKEN_TTL,
  REFRESH_TOKEN_TTL_DAYS,
} from '../../common/constants';
import {
  EmailAlreadyRegisteredException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from '../../common/exceptions';
import type { JwtPayload } from '../../common/interfaces';
import { requireConfigValue } from '../../config';
import { Member } from '../members/entities/member.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { toUserResponse } from '../users/mappers/user.mapper';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import type { AuthTokens } from './interfaces/auth-tokens.interface';
import type { IAuthService } from './interfaces/auth-service.interface';

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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.jwtSecret = requireConfigValue(configService, CONFIG_KEYS.JWT_SECRET);
    this.refreshTokenSecret = requireConfigValue(configService, CONFIG_KEYS.REFRESH_TOKEN_SECRET);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, churchId } = registerDto;

    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new EmailAlreadyRegisteredException(email);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // members.userId is NOT NULL UNIQUE, so every account is also a church
    // member. Both rows are written together — a user without its member row
    // can never be scheduled.
    const user = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(User, { email, passwordHash, name, churchId }),
      );

      await manager.save(
        manager.create(Member, { userId: created.id, churchId, fullName: name }),
      );

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
