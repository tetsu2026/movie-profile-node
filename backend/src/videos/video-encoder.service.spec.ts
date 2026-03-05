import { Test, TestingModule } from '@nestjs/testing';
import { VideoEncoderService } from './video-encoder.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs';

// fluent-ffmpeg をモック
jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = jest.fn().mockImplementation(() => ({
    outputOptions: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function (this: any, event: string, cb: any) {
      if (event === 'end') {
        // end コールバックを保持して後で呼べるようにする
        this._endCb = cb;
      }
      if (event === 'error') {
        this._errorCb = cb;
      }
      return this;
    }),
    run: jest.fn().mockImplementation(function (this: any) {
      // デフォルトでは成功（endを呼ぶ）
      if (this._endCb) this._endCb();
    }),
  }));
  return mockFfmpeg;
});

// fs モジュールを部分モック
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('encoded-data')),
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
}));

describe('VideoEncoderService', () => {
  let service: VideoEncoderService;
  let prisma: jest.Mocked<any>;
  let storageService: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      video: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };

    storageService = {
      download: jest.fn().mockResolvedValue(Buffer.from('video-data')),
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoEncoderService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<VideoEncoderService>(VideoEncoderService);

    jest.clearAllMocks();
    // デフォルトのモック設定を再適用
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('encoded-data'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    storageService.download.mockResolvedValue(Buffer.from('video-data'));
    storageService.upload.mockResolvedValue(undefined);
    storageService.delete.mockResolvedValue(undefined);
    prisma.video.update.mockResolvedValue(undefined);
  });

  describe('encode', () => {
    it('正常にエンコードが完了する', async () => {
      const result = await service.encode(1, 1, 'users/1/original/1.mp4');

      expect(result).toBe(true);

      // S3からダウンロード
      expect(storageService.download).toHaveBeenCalledWith('users/1/original/1.mp4');

      // エンコード済み動画をS3にアップロード
      expect(storageService.upload).toHaveBeenCalledWith(
        'users/1/encoded/1.mp4',
        expect.any(Buffer),
        'video/mp4',
      );

      // ステータスを completed に更新
      expect(prisma.video.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          encodedPath: 'users/1/encoded/1.mp4',
          status: 'completed',
          errorMessage: null,
        },
      });

      // 元動画をS3から削除
      expect(storageService.delete).toHaveBeenCalledWith('users/1/original/1.mp4');

      // 一時ファイル削除
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    it('元動画のS3削除に失敗しても処理は成功する', async () => {
      storageService.delete.mockRejectedValue(new Error('S3 delete error'));

      const result = await service.encode(1, 1, 'users/1/original/1.mp4');

      // エンコード自体は成功
      expect(result).toBe(true);
      expect(prisma.video.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('S3ダウンロード失敗時は一時ファイルをクリーンアップする', async () => {
      storageService.download.mockRejectedValue(new Error('Download failed'));

      await expect(service.encode(1, 1, 'users/1/original/1.mp4')).rejects.toThrow('Download failed');

      // finally ブロックでクリーンアップ
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('S3アップロード失敗時は一時ファイルをクリーンアップする', async () => {
      storageService.upload.mockRejectedValue(new Error('Upload failed'));

      await expect(service.encode(1, 1, 'users/1/original/1.mp4')).rejects.toThrow('Upload failed');

      // finally ブロックでクリーンアップ
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('エンコードパスが正しく生成される', async () => {
      await service.encode(5, 3, 'users/3/original/5.mov');

      expect(storageService.upload).toHaveBeenCalledWith(
        'users/3/encoded/5.mp4',
        expect.any(Buffer),
        'video/mp4',
      );
    });
  });

  describe('markFailed', () => {
    it('動画のステータスをfailedに更新する', async () => {
      await service.markFailed(1, 'エンコードに失敗しました');

      expect(prisma.video.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'failed',
          errorMessage: 'エンコードに失敗しました',
        },
      });
    });
  });
});
