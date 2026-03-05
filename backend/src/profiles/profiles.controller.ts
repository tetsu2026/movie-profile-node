import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../types/express';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * 認証ユーザーのプロフィール取得
   */
  @UseGuards(JwtAuthGuard)
  @Get('profiles/me')
  async getMyProfile(@CurrentUser() user: AuthUser) {
    return this.profilesService.getMyProfile(user.id);
  }

  /**
   * プロフィール更新
   */
  @UseGuards(JwtAuthGuard)
  @Put('profiles/me')
  async updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.updateMyProfile(user.id, dto);
  }

  /**
   * 公開プロフィール取得
   */
  @Get('users/:id/profile')
  async getPublicProfile(@Param('id', ParseIntPipe) id: number) {
    return this.profilesService.getPublicProfile(id);
  }
}
