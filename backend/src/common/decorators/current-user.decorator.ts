import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 認証済みユーザー情報を取得するカスタムデコレータ
 *
 * @example
 * @Get('me')
 * async getMe(@CurrentUser() user: AuthUser) {
 *   return this.service.getMe(user.id);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
