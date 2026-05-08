import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
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

    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    return user;
  }

  /**
   * ユーザー登録（User + Profile 同時作成）
   */
  async register(dto: RegisterDto) {
    // パスワード確認チェック
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException('パスワードが一致しません');
    }

    // メール重複チェック
    const existing = await this.prisma.user.findFirst({
      where: { deletedAt: null, email: dto.email },
    });
    if (existing) {
      throw new ConflictException('このメールアドレスは既に登録されています');
    }

    const hashedPassword = await this.hashPassword(dto.password);

    // トランザクションで User + Profile を同時作成
    const user = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: 'user',
          // Node.js版では確認メールを送らないため、登録時点で検証済みとして扱う。
          // これがないとLaravel側ログイン時にメール確認画面へ遷移してしまう。
          emailVerifiedAt: new Date(),
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

    const isValid = await this.verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('現在のパスワードが正しくありません');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * アカウント削除（ソフトデリート）
   */
  async deleteAccount(userId: number) {
    // 動画のS3ファイルを削除
    const videos = await this.prisma.video.findMany({
      where: { deletedAt: null, userId },
    });

    for (const video of videos) {
      if (video.encodedPath) {
        try {
          await this.storageService.delete(video.encodedPath);
        } catch (error) {
          this.logger.warn(`S3ファイル削除失敗: ${video.encodedPath}`, error);
        }
      }
      if (video.originalPath) {
        try {
          await this.storageService.delete(video.originalPath);
        } catch (error) {
          this.logger.warn(`S3ファイル削除失敗: ${video.originalPath}`, error);
        }
      }
    }

    // ソフトデリート
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`アカウント削除: ${userId}`);
  }

  /**
   * パスワードをハッシュ化（Laravel互換: $2b$ → $2y$ に変換）
   */
  private async hashPassword(password: string): Promise<string> {
    const hash = await bcrypt.hash(password, 12);
    return hash.replace(/^\$2b\$/, '$2y$');
  }

  /**
   * パスワードを検証（Laravel互換: $2y$ → $2b$ に変換してから比較）
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashForCompare = hash.replace(/^\$2y\$/, '$2b$');
    return bcrypt.compare(password, hashForCompare);
  }
}
