import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    // JWT_SECRET が未設定なら起動時に即エラー（fail fast）
    const secret = configService.getOrThrow<string>('JWT_SECRET');

    super({
      // httpOnly Cookie からトークンを取得
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: number; role: string }) {
    return { id: payload.sub, role: payload.role };
  }
}
