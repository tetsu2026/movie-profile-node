import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

export default function ProfileSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setMessage('パスワードを更新しました');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      setError('パスワードの更新に失敗しました');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      await api.delete('/auth/me');
      await logout();
      navigate('/');
    } catch {
      setError('アカウントの削除に失敗しました');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">アカウント設定</h1>

      {message && <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-600">{message}</div>}
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* アカウント情報 */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">アカウント情報</h2>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium text-gray-700">名前:</span> {user?.name}</p>
          <p><span className="font-medium text-gray-700">メール:</span> {user?.email}</p>
          <p><span className="font-medium text-gray-700">権限:</span> {user?.role}</p>
        </div>
      </div>

      {/* パスワード変更 */}
      <form onSubmit={handlePasswordUpdate} className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">パスワード変更</h2>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">現在のパスワード</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">新しいパスワード</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          パスワードを更新
        </button>
      </form>

      {/* アカウント削除 */}
      <div className="rounded-lg border border-red-200 bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-red-600">アカウント削除</h2>
        <p className="mb-4 text-sm text-gray-600">
          アカウントを削除すると、すべてのデータが削除されます。この操作は取り消せません。
        </p>
        <button
          onClick={handleDeleteAccount}
          className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          アカウントを削除
        </button>
      </div>
    </div>
  );
}
