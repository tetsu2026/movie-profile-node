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

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">ユーザー管理</h1>

      {message && (
        <div className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">ID</th>
              <th className="px-4 py-3 font-medium text-gray-700">名前</th>
              <th className="px-4 py-3 font-medium text-gray-700">メール</th>
              <th className="px-4 py-3 font-medium text-gray-700">権限</th>
              <th className="px-4 py-3 font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-gray-500">{user.id}</td>
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  {user.role === 'admin' ? (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">管理者</span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">一般</span>
                  )}
                </td>
                <td className="flex gap-2 px-4 py-3">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => fetchUsers(page)}
              className={`rounded px-3 py-1 text-sm ${
                page === pagination.page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
