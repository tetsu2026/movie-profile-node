import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

// Cookie設定の共通オプション
// HTTPS未使用の環境ではsecure: falseにする必要がある
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * ユーザー登録
   */
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(dto);
    const tokens = this.authService.generateTokens(user.id, user.role);

    this.setTokenCookies(res, tokens);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * ログイン
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { id: number; role: string; name: string; email: string };
    const tokens = this.authService.generateTokens(user.id, user.role);

    this.setTokenCookies(res, tokens);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * ログアウト
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    return { message: 'ログアウトしました' };
  }

  /**
   * トークンリフレッシュ
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('リフレッシュトークンがありません');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setTokenCookies(res, tokens);

    return { message: 'トークンを更新しました' };
  }

  /**
   * 認証ユーザー情報取得
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.authService.getMe(user.id);
  }

  /**
   * パスワード更新
   */
  @UseGuards(JwtAuthGuard)
  @Put('password')
  async updatePassword(
    @Req() req: Request,
    @Body() dto: UpdatePasswordDto,
  ) {
    const user = req.user as { id: number };
    await this.authService.updatePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'パスワードを更新しました' };
  }

  /**
   * アカウント削除
   */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteAccount(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { id: number };
    await this.authService.deleteAccount(user.id);

    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);

    return { message: 'アカウントを削除しました' };
  }

  /**
   * Cookie にトークンをセット
   */
  private setTokenCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    res.cookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15分
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日
    });
  }
}
