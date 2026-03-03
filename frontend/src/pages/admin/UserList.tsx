import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  totalPages: number;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchUsers = async (page: number = 1) => {
    setLoading(true);
    const res = await api.get(`/admin/users?page=${page}`);
    const data = res.data.data;
    setUsers(data.users);
    setPagination(data.pagination);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: number, userName: string) => {
    if (!window.confirm(`${userName} を削除しますか？`)) return;

    try {
      const res = await api.delete(`/admin/users/${userId}`);
      setMessage(res.data.data.message);
      fetchUsers(pagination?.page);
    } catch {
      setMessage('削除に失敗しました');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

      <h1 className="mb-8 text-2xl font-bold text-gray-900">ユーザー管理</h1>

      {message && (
        <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">ID</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">メール</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">名前</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">権限</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">作成日時</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-500">{user.id}</td>
                <td className="px-5 py-3 text-gray-500">{user.email}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-5 py-3">
                  {user.role === 'admin' ? (
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: '#FFF1F2', color: '#B91C1C' }}
                    >
                      管理者
                    </span>
                  ) : (
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                    >
                      一般ユーザー
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <Link
                      to={`/admin/users/${user.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      編集
                    </Link>
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ページネーション（テーブルカード内下部） */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 border-t border-gray-100 px-5 py-4">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => fetchUsers(page)}
                className={`rounded-full px-3 py-1 text-sm ${
                  page === pagination.page
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
