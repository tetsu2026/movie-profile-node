import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * ダッシュボード情報取得
   */
  @Get()
  async getDashboard(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.dashboardService.getDashboard(user.id);
  }
}
