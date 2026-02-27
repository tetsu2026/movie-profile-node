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
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const profile = data?.profile;
  const stats = data?.videoStats;

  // プロフィール完成度チェック
  const completionItems = [
    { label: '名前', done: !!profile?.name },
    { label: '経歴', done: !!profile?.biography },
    { label: 'サムネイル動画', done: !!profile?.thumbnailVideo },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* タイトル */}
      <div className="mb-8">
        <h1
          className="text-3xl font-extrabold tracking-tight text-gray-900"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          ダッシュボード
        </h1>
        <p className="mt-1 text-gray-500">
          ようこそ、{profile?.name || user?.name || 'ゲスト'} さん
        </p>
      </div>

      {/* Bentoグリッド アクションカード */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* プロフィール編集 */}
        <Link
          to="/dashboard/profile/edit"
          className="rounded-2xl p-5 transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: '#EFF6FF' }}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#2563EB' }}>
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">プロフィール編集</h3>
          <p className="mt-1 text-xs text-gray-500">名前・経歴・動画を設定</p>
        </Link>

        {/* 動画管理 */}
        <Link
          to="/dashboard/videos"
          className="rounded-2xl p-5 transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: '#F0FDF4' }}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#16A34A' }}>
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">動画管理</h3>
          <p className="mt-1 text-xs text-gray-500">アップロード・削除</p>
        </Link>

        {/* プレビュー */}
        <Link
          to={`/users/${user?.id}`}
          className="rounded-2xl p-5 transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: '#FAF5FF' }}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#7C3AED' }}>
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">プレビュー</h3>
          <p className="mt-1 text-xs text-gray-500">公開ページを確認</p>
        </Link>

        {/* 公開ページを見る */}
        <Link
          to={`/users/${user?.id}`}
          className="rounded-2xl p-5 text-white transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: '#1D1D1F' }}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
          <h3 className="font-semibold">公開ページを見る</h3>
          <p className="mt-1 text-xs text-white/60">外部公開リンク</p>
        </Link>

        {/* 管理者パネル（管理者のみ） */}
        {user?.role === 'admin' && (
          <Link
            to="/admin/users"
            className="col-span-full rounded-2xl p-5 transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: '#FFF1F2' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#DC2626' }}>
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">管理者パネル</h3>
                <p className="text-xs text-gray-500">ユーザー管理・システム設定</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* プロフィール完成度パネル */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">プロフィール完成度</h2>
          <ul className="space-y-3">
            {completionItems.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                {item.done ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                    </svg>
                  </span>
                )}
                <span className={`text-sm ${item.done ? 'text-gray-900' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 動画統計パネル */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">動画統計</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4" style={{ backgroundColor: '#F5F5F7' }}>
              <p className="text-xs text-gray-500">合計</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#F0FDF4' }}>
              <p className="text-xs text-gray-500">完了</p>
              <p className="text-2xl font-bold" style={{ color: '#16A34A' }}>{stats?.completed ?? 0}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFBEB' }}>
              <p className="text-xs text-gray-500">エンコード中</p>
              <p className="text-2xl font-bold" style={{ color: '#D97706' }}>{stats?.encoding ?? 0}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF1F2' }}>
              <p className="text-xs text-gray-500">失敗</p>
              <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{stats?.failed ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
