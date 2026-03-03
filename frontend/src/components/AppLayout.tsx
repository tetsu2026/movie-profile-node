import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ナビゲーションバー */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-lg font-bold text-gray-800">
                動画プロフィール
              </Link>
              <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                ダッシュボード
              </Link>
              <Link to="/dashboard/profile/edit" className="text-sm text-gray-600 hover:text-gray-900">
                プロフィール編集
              </Link>
              <Link to="/dashboard/videos" className="text-sm text-gray-600 hover:text-gray-900">
                動画管理
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin/users" className="text-sm text-gray-600 hover:text-gray-900">
                  管理者
                </Link>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Link to="/profile" className="text-sm text-gray-600 hover:text-gray-900">
                {user?.name}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
