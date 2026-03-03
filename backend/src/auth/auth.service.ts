import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * メールとパスワードでユーザーを検証
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { deletedAt: null, email },
    });

    if (!user) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    // Laravel互換: $2y$ プレフィックスを $2b$ に変換してから比較
    const hashForCompare = user.password.replace(/^\$2y\$/, '$2b$');
    const isPasswordValid = await bcrypt.compare(password, hashForCompare);
    if (!isPasswordValid) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    return user;
  }

  /**
   * ユーザー登録（User + Profile 同時作成）
   */
  async register(dto: RegisterDto) {
    // メール重複チェック
    const existing = await this.prisma.user.findFirst({
      where: { deletedAt: null, email: dto.email },
    });
    if (existing) {
      throw new ConflictException('このメールアドレスは既に登録されています');
    }

    // Laravel互換: $2b$ → $2y$ に変換して保存
    const hashedPassword = (await bcrypt.hash(dto.password, 12)).replace(/^\$2b\$/, '$2y$');

    // トランザクションで User + Profile を同時作成
    const user = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: 'user',
        },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          name: dto.name,
          isPublic: true,
        },
      });

      return user;
    });

    this.logger.log(`ユーザー登録完了: ${user.id}`);
    return user;
  }

  /**
   * JWTトークンペアを生成
   */
  generateTokens(userId: number, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    return { accessToken, refreshToken };
  }

  /**
   * リフレッシュトークンを検証して新しいトークンペアを返す
   */
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findFirst({
        where: { deletedAt: null, id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('ユーザーが見つかりません');
      }

      return this.generateTokens(user.id, user.role);
    } catch {
      throw new UnauthorizedException('リフレッシュトークンが無効です');
    }
  }

  /**
   * ユーザー情報を取得（パスワード除外）
   */
  async getMe(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { deletedAt: null, id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    return user;
  }

  /**
   * パスワード更新
   */
  async updatePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { deletedAt: null, id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    // Laravel互換: $2y$ プレフィックスを $2b$ に変換してから比較
    const hashForCompare = user.password.replace(/^\$2y\$/, '$2b$');
    const isValid = await bcrypt.compare(currentPassword, hashForCompare);
    if (!isValid) {
      throw new UnauthorizedException('現在のパスワードが正しくありません');
    }

    // Laravel互換: $2b$ → $2y$ に変換して保存
    const hashedPassword = (await bcrypt.hash(newPassword, 12)).replace(/^\$2b\$/, '$2y$');
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * アカウント削除（ソフトデリート）
   */
  async deleteAccount(userId: number) {
    await this.prisma.user.delete({
      where: { id: userId },
    });
    this.logger.log(`アカウント削除: ${userId}`);
  }
}
