import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

interface Video {
  id: number;
  originalFilename: string;
  status: string;
  fileSize: number | null;
  encodedUrl: string | null;
  createdAt: string;
  errorMessage: string | null;
}

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [thumbnailVideoId, setThumbnailVideoId] = useState<number | null>(null);
  const [popupVideoId, setPopupVideoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchVideos = async () => {
    const res = await api.get('/videos');
    const data = res.data.data;
    setVideos(data.videos);
    setThumbnailVideoId(data.thumbnailVideoId);
    setPopupVideoId(data.popupVideoId);
  };

  useEffect(() => {
    fetchVideos().finally(() => setLoading(false));
  }, []);

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

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">完了</span>;
      case 'encoding': return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">エンコード中</span>;
      case 'uploading': return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">アップロード中</span>;
      case 'failed': return <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">失敗</span>;
      default: return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">{status}</span>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">動画管理</h1>
        <Link
          to="/dashboard/videos/upload"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          動画をアップロード
        </Link>
      </div>

      {message && (
        <div className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
      )}

      {videos.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-500">まだ動画がアップロードされていません</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">ファイル名</th>
                <th className="px-4 py-3 font-medium text-gray-700">ステータス</th>
                <th className="px-4 py-3 font-medium text-gray-700">サイズ</th>
                <th className="px-4 py-3 font-medium text-gray-700">使用中</th>
                <th className="px-4 py-3 font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {videos.map((video) => (
                <tr key={video.id}>
                  <td className="px-4 py-3">{video.originalFilename}</td>
                  <td className="px-4 py-3">{statusLabel(video.status)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatFileSize(video.fileSize)}</td>
                  <td className="px-4 py-3">
                    {video.id === thumbnailVideoId && (
                      <span className="mr-1 rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-800">サムネイル</span>
                    )}
                    {video.id === popupVideoId && (
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">ポップアップ</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
        </div>
      )}
    </div>
  );
}
