import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

interface DashboardData {
  profile: {
    name: string;
    biography: string | null;
    thumbnailVideo: { id: number; encodedPath: string } | null;
    popupVideo: { id: number; encodedPath: string } | null;
  } | null;
  videoStats: {
    total: number;
    uploading: number;
    encoding: number;
    completed: number;
    failed: number;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">ダッシュボード</h1>

      {/* 動画ステータス集計 */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">完了</p>
          <p className="text-3xl font-bold text-green-600">{data?.videoStats.completed ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">エンコード中</p>
          <p className="text-3xl font-bold text-yellow-600">{data?.videoStats.encoding ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">失敗</p>
          <p className="text-3xl font-bold text-red-600">{data?.videoStats.failed ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">合計</p>
          <p className="text-3xl font-bold text-gray-900">{data?.videoStats.total ?? 0}</p>
        </div>
      </div>

      {/* クイックリンク */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/dashboard/profile/edit"
          className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <h3 className="mb-2 font-semibold text-gray-900">プロフィール編集</h3>
          <p className="text-sm text-gray-500">名前、経歴、動画の設定を変更</p>
        </Link>

        <Link
          to="/dashboard/videos"
          className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <h3 className="mb-2 font-semibold text-gray-900">動画管理</h3>
          <p className="text-sm text-gray-500">動画のアップロード・削除</p>
        </Link>

        <Link
          to={`/users/${user?.id}`}
          className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <h3 className="mb-2 font-semibold text-gray-900">公開ページ</h3>
          <p className="text-sm text-gray-500">あなたのプロフィールページを確認</p>
        </Link>
      </div>
    </div>
  );
}
