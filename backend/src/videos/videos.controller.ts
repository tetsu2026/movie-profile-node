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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import * as path from 'path';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../types/express';

// 対応MIMEタイプ
const ALLOWED_MIMES = [
  'video/mp4',
  'video/quicktime',    // mov
  'video/x-msvideo',    // avi
  'video/x-ms-wmv',     // wmv
];

// 最大ファイルサイズ: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
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
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('動画ファイルを選択してください');
    }

    return this.videosService.upload(user.id, file);
  }

  /**
   * 動画一覧取得
   */
  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    return this.videosService.findAllByUser(user.id);
  }

  /**
   * 動画ステータス取得（ポーリング用）
   */
  @Get(':id/status')
  async getStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.videosService.getStatus(id, user.id);
  }

  /**
   * 動画削除
   */
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Query('forceDelete') forceDelete: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.videosService.delete(id, user.id, forceDelete === 'true');
  }
}
