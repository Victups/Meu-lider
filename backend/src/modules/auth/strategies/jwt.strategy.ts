import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CONFIG_KEYS, JWT_STRATEGY_NAME } from '../../../common/constants';
import type { JwtPayload, JwtUser } from '../../../common/interfaces';
import { requireConfigValue } from '../../../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireConfigValue(configService, CONFIG_KEYS.JWT_SECRET),
    });
  }

  validate(payload: JwtPayload): JwtUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      churchId: payload.churchId,
    };
  }
}
