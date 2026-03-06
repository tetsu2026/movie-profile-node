import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

// ポーリング間隔（ミリ秒）
const POLL_INTERVAL = 5000;

interface Video {
  id: number;
  originalFilename: string;
  status: string;
  fileSize: number | null;
  encodedUrl: string | null;
  createdAt: string;
  errorMessage: string | null;
}

// ステータスバッジの色定義
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: '#F0FDF4', color: '#16A34A', label: '完了' },
  encoding: { bg: '#FFFBEB', color: '#D97706', label: 'エンコード中' },
  uploading: { bg: '#EFF6FF', color: '#2563EB', label: 'アップロード中' },
  failed: { bg: '#FFF1F2', color: '#DC2626', label: '失敗' },
};

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [thumbnailVideoId, setThumbnailVideoId] = useState<number | null>(null);
  const [popupVideoId, setPopupVideoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await api.get('/videos');
      const data = res.data.data;
      setVideos(data.videos);
      setThumbnailVideoId(data.thumbnailVideoId);
      setPopupVideoId(data.popupVideoId);
      return data.videos as Video[];
    } catch {
      return null;
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchVideos().finally(() => setLoading(false));
  }, [fetchVideos]);

  // エンコード中・アップロード中の動画がある場合のみポーリング
  useEffect(() => {
    const hasProcessing = videos.some(
      (v) => v.status === 'encoding' || v.status === 'uploading',
    );

    if (hasProcessing && !timerRef.current) {
      timerRef.current = setInterval(async () => {
        const result = await fetchVideos();
        if (result && !result.some((v: Video) => v.status === 'encoding' || v.status === 'uploading')) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, POLL_INTERVAL);
    } else if (!hasProcessing && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [videos, fetchVideos]);

  const handleDelete = async (videoId: number, forceDelete: boolean = false) => {
    try {
      const res = await api.delete(`/videos/${videoId}?forceDelete=${forceDelete}`);
      setMessage(res.data.data.message);
      await fetchVideos();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const errorMsg = axiosError.response?.data?.message || '削除に失敗しました';

      // プロフィール使用中の場合は確認ダイアログ
      if (errorMsg.includes('使用中') && !forceDelete) {
        if (window.confirm(`${errorMsg}\n強制的に削除しますか？`)) {
          handleDelete(videoId, true);
        }
      } else {
        setMessage(errorMsg);
      }
    }
  };

  const statusBadge = (status: string) => {
    const style = STATUS_STYLES[status] || { bg: '#F5F5F7', color: '#6B7280', label: status };
    return (
      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {style.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const usageBadges = (videoId: number) => {
    const isThumbnail = videoId === thumbnailVideoId;
    const isPopup = videoId === popupVideoId;
    if (!isThumbnail && !isPopup) return <span className="text-xs text-gray-300">—</span>;
    return (
      <div className="flex items-center gap-1">
        {isThumbnail && (
          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>サムネイル</span>
        )}
        {isPopup && (
          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: '#F0F9FF', color: '#0369A1' }}>ポップアップ</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* 戻るリンク */}
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        ダッシュボードに戻る
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">動画管理</h1>
        <Link
          to="/dashboard/videos/upload"
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1D1D1F' }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          動画をアップロード
        </Link>
      </div>

      {message && (
        <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
      )}

      {videos.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="mb-1 text-lg font-semibold text-gray-900">動画がありません</h3>
          <p className="mb-4 text-sm text-gray-500">最初の動画をアップロードしましょう</p>
          <Link
            to="/dashboard/videos/upload"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: '#1D1D1F' }}
          >
            動画をアップロード
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          {/* PC版: テーブル表示 */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">ファイル名</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">ステータス</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">作成日時</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">設定状況</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {videos.map((video) => (
                <tr key={video.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{video.originalFilename}</td>
                  <td className="px-5 py-3">{statusBadge(video.status)}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(video.createdAt)}</td>
                  <td className="px-5 py-3">{usageBadges(video.id)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* スマホ版: カード表示 */}
          <div className="divide-y divide-gray-50 md:hidden">
            {videos.map((video) => (
              <div key={video.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{video.originalFilename}</p>
                    <div className="mt-2">
                      {statusBadge(video.status)}
                    </div>
                    {(video.id === thumbnailVideoId || video.id === popupVideoId) && (
                      <div className="mt-1.5 flex items-center gap-2">
                        {video.id === thumbnailVideoId && (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>サムネイル</span>
                        )}
                        {video.id === popupVideoId && (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: '#F0F9FF', color: '#0369A1' }}>ポップアップ</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">{formatDate(video.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
