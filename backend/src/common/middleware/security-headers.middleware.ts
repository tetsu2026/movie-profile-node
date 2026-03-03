import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * セキュリティヘッダーを付与するミドルウェア
 *
 * XSS、クリックジャッキング、MIMEスニッフィングなどの
 * 攻撃を防ぐためのHTTPヘッダーを設定します。
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // XSSフィルターを有効化（レガシーブラウザ向け）
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // MIMEスニッフィングを防止
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // クリックジャッキングを防止
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // リファラー情報を制限
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 権限ポリシーを設定
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // HTTPS使用時はHSTSを有効化
    if (req.secure) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  }
}
