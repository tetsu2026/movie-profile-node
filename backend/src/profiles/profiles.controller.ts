import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * 認証ユーザーのプロフィール取得
   */
  @UseGuards(JwtAuthGuard)
  @Get('profiles/me')
  async getMyProfile(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.profilesService.getMyProfile(user.id);
  }

  /**
   * プロフィール更新
   */
  @UseGuards(JwtAuthGuard)
  @Put('profiles/me')
  async updateMyProfile(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = req.user as { id: number };
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
