import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * ユーザー一覧取得
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.findAll(
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 10,
    );
  }

  /**
   * ユーザー詳細取得
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findOne(id);
  }

  /**
   * ユーザー情報更新
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.update(id, dto);
  }

  /**
   * ユーザー削除
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.delete(id);
  }
}
