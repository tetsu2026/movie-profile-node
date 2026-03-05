/**
 * JWTペイロードから取得される認証ユーザー情報
 */
export interface AuthUser {
  id: number;
  role: string;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AuthUser {}
  }
}
