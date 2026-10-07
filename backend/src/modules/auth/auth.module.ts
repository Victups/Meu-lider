import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACCESS_TOKEN_TTL, CONFIG_KEYS } from '../../common/constants';
import { requireConfigValue } from '../../config';
import { InvitationsModule } from '../invitations/invitations.module';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, PasswordResetToken]),
    InvitationsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: requireConfigValue(configService, CONFIG_KEYS.JWT_SECRET),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
