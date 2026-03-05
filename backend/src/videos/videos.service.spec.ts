import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { VideosService } from './videos.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

// モック用の動画データ
const mockVideo = {
  id: 1,
  userId: 1,
  originalFilename: 'test.mp4',
  originalPath: 'users/1/original/1.mp4',
  encodedPath: 'users/1/encoded/1.mp4',
  status: 'completed',
  fileSize: BigInt(1024),
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockProfile = {
  userId: 1,
  thumbnailVideoId: null,
  popupVideoId: null,
  deletedAt: null,
};

describe('VideosService', () => {
  let service: VideosService;
  let prisma: jest.Mocked<any>;
  let storageService: jest.Mocked<any>;
  let encodingQueue: jest.Mocked<any>;

  beforeEach(async () => {
    // モック作成
    prisma = {
      video: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      profile: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    storageService = {
      upload: jest.fn().mockResolvedValue(undefined),
      download: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      getUrl: jest.fn().mockImplementation((key: string) => `https://s3.example.com/${key}`),
    };

    encodingQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storageService },
        { provide: getQueueToken('video-encoding'), useValue: encodingQueue },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
  });

  describe('delete', () => {
    it('正常に動画を削除できる', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo });
      prisma.profile.findFirst.mockResolvedValue({ ...mockProfile });
      prisma.video.delete.mockResolvedValue(undefined);

      const result = await service.delete(1, 1);

      expect(result).toEqual({ message: '動画を削除しました' });
      expect(storageService.delete).toHaveBeenCalledWith('users/1/encoded/1.mp4');
      expect(storageService.delete).toHaveBeenCalledWith('users/1/original/1.mp4');
      expect(prisma.video.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('存在しない動画の場合はNotFoundExceptionを投げる', async () => {
      prisma.video.findFirst.mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('他ユーザーの動画の場合はForbiddenExceptionを投げる', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo, userId: 2 });

      await expect(service.delete(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('プロフィールで使用中かつforceDelete=falseの場合はBadRequestExceptionを投げる', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo });
      prisma.profile.findFirst.mockResolvedValue({
        ...mockProfile,
        thumbnailVideoId: 1,
      });

      await expect(service.delete(1, 1, false)).rejects.toThrow(BadRequestException);
    });

    it('プロフィールで使用中でもforceDelete=trueなら削除できる', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo });
      prisma.profile.findFirst.mockResolvedValue({
        ...mockProfile,
        thumbnailVideoId: 1,
      });
      prisma.profile.update.mockResolvedValue(undefined);
      prisma.video.delete.mockResolvedValue(undefined);

      const result = await service.delete(1, 1, true);

      expect(result.message).toContain('サムネイル動画の設定を解除');
      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { thumbnailVideoId: null },
      });
    });

    it('サムネイルとポップアップ両方で使用中の場合は両方解除される', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo });
      prisma.profile.findFirst.mockResolvedValue({
        ...mockProfile,
        thumbnailVideoId: 1,
        popupVideoId: 1,
      });
      prisma.profile.update.mockResolvedValue(undefined);
      prisma.video.delete.mockResolvedValue(undefined);

      const result = await service.delete(1, 1, true);

      expect(result.message).toContain('サムネイル動画とポップアップ動画の設定を解除');
      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { thumbnailVideoId: null, popupVideoId: null },
      });
    });

    it('ポップアップのみ使用中の場合はポップアップのみ解除される', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo });
      prisma.profile.findFirst.mockResolvedValue({
        ...mockProfile,
        popupVideoId: 1,
      });
      prisma.profile.update.mockResolvedValue(undefined);
      prisma.video.delete.mockResolvedValue(undefined);

      const result = await service.delete(1, 1, true);

      expect(result.message).toContain('ポップアップ動画の設定を解除');
    });

    it('S3削除失敗時もソフトデリートは実行される', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo });
      prisma.profile.findFirst.mockResolvedValue({ ...mockProfile });
      storageService.delete.mockRejectedValue(new Error('S3 error'));
      prisma.video.delete.mockResolvedValue(undefined);

      const result = await service.delete(1, 1);

      expect(result).toEqual({ message: '動画を削除しました' });
      expect(prisma.video.delete).toHaveBeenCalled();
    });

    it('encodedPathがnullの場合はS3削除をスキップする', async () => {
      prisma.video.findFirst.mockResolvedValue({
        ...mockVideo,
        encodedPath: null,
        originalPath: null,
      });
      prisma.profile.findFirst.mockResolvedValue({ ...mockProfile });
      prisma.video.delete.mockResolvedValue(undefined);

      await service.delete(1, 1);

      expect(storageService.delete).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('動画のステータスを取得できる', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo });

      const result = await service.getStatus(1, 1);

      expect(result).toEqual({
        id: 1,
        status: 'completed',
        errorMessage: null,
        encodedUrl: 'https://s3.example.com/users/1/encoded/1.mp4',
      });
    });

    it('存在しない動画の場合はNotFoundExceptionを投げる', async () => {
      prisma.video.findFirst.mockResolvedValue(null);

      await expect(service.getStatus(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('他ユーザーの動画の場合はNotFoundExceptionを投げる', async () => {
      prisma.video.findFirst.mockResolvedValue({ ...mockVideo, userId: 2 });

      await expect(service.getStatus(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('encodedPathがnullの場合はencodedUrlもnull', async () => {
      prisma.video.findFirst.mockResolvedValue({
        ...mockVideo,
        encodedPath: null,
      });

      const result = await service.getStatus(1, 1);

      expect(result.encodedUrl).toBeNull();
    });
  });

  describe('findAllByUser', () => {
    it('ユーザーの動画一覧を取得できる', async () => {
      prisma.video.findMany.mockResolvedValue([{ ...mockVideo }]);
      prisma.profile.findFirst.mockResolvedValue({
        thumbnailVideoId: 1,
        popupVideoId: null,
      });

      const result = await service.findAllByUser(1);

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].fileSize).toBe(1024);
      expect(result.videos[0].encodedUrl).toBe('https://s3.example.com/users/1/encoded/1.mp4');
      expect(result.thumbnailVideoId).toBe(1);
      expect(result.popupVideoId).toBeNull();
    });

    it('動画がない場合は空配列を返す', async () => {
      prisma.video.findMany.mockResolvedValue([]);
      prisma.profile.findFirst.mockResolvedValue(null);

      const result = await service.findAllByUser(1);

      expect(result.videos).toEqual([]);
      expect(result.thumbnailVideoId).toBeNull();
      expect(result.popupVideoId).toBeNull();
    });

    it('encodedPathがnullの動画はencodedUrlがnull', async () => {
      prisma.video.findMany.mockResolvedValue([{
        ...mockVideo,
        encodedPath: null,
        status: 'encoding',
      }]);
      prisma.profile.findFirst.mockResolvedValue(null);

      const result = await service.findAllByUser(1);

      expect(result.videos[0].encodedUrl).toBeNull();
    });
  });
});
