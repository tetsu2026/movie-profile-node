import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// 対応MIMEタイプ
const ALLOWED_MIMES = [
  'video/mp4',
  'video/quicktime',    // mov
  'video/x-msvideo',    // avi
  'video/x-ms-wmv',     // wmv
];

// 最大ファイルサイズ: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  /**
   * 動画アップロード
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('video', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              '対応していないファイル形式です。mp4, mov, avi, wmv のみアップロード可能です',
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('動画ファイルを選択してください');
    }

    const user = req.user as { id: number };
    return this.videosService.upload(user.id, file);
  }

  /**
   * 動画一覧取得
   */
  @Get()
  async findAll(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.videosService.findAllByUser(user.id);
  }

  /**
   * 動画ステータス取得（ポーリング用）
   */
  @Get(':id/status')
  async getStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number };
    return this.videosService.getStatus(id, user.id);
  }

  /**
   * 動画削除
   */
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Query('forceDelete') forceDelete: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number };
    return this.videosService.delete(id, user.id, forceDelete === 'true');
  }
}
