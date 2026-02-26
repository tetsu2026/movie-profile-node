import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="mb-4 text-4xl font-extrabold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        動画付き自己紹介プラットフォーム
      </h1>
      <p className="mb-8 text-lg text-gray-600">
        動画であなたの魅力を伝えましょう
      </p>
      <div className="flex gap-4">
        {user ? (
          <Link
            to="/dashboard"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            ダッシュボードへ
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              ログイン
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              新規登録
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
