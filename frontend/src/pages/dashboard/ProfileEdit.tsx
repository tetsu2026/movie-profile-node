import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

interface Video {
  id: number;
  originalFilename: string;
  encodedPath: string;
  status: string;
}

interface Profile {
  name: string;
  biography: string | null;
  thumbnailVideoId: number | null;
  popupVideoId: number | null;
  themeColor: string;
}

export default function ProfileEdit() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/profiles/me'),
      api.get('/videos'),
    ]).then(([profileRes, videosRes]) => {
      const p = profileRes.data.data;
      setProfile({
        name: p.name,
        biography: p.biography || '',
        thumbnailVideoId: p.thumbnailVideoId,
        popupVideoId: p.popupVideoId,
        themeColor: p.themeColor || '#667eea',
      });
      // エンコード完了済み動画のみ
      const completed = videosRes.data.data.videos.filter(
        (v: Video) => v.status === 'completed',
      );
      setVideos(completed);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.put('/profiles/me', profile);
      setSuccess('プロフィールを更新しました');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">プロフィール編集</h1>

      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
        {/* 名前 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">名前 *</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            maxLength={50}
          />
        </div>

        {/* 経歴 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">経歴</label>
          <textarea
            value={profile.biography || ''}
            onChange={(e) => setProfile({ ...profile, biography: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={6}
            maxLength={1000}
          />
          <p className="mt-1 text-sm text-gray-500">{(profile.biography || '').length}/1000</p>
        </div>

        {/* サムネイル動画 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">サムネイル動画</label>
          <select
            value={profile.thumbnailVideoId ?? ''}
            onChange={(e) => setProfile({
              ...profile,
              thumbnailVideoId: e.target.value ? Number(e.target.value) : null,
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">未設定</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>{v.originalFilename}</option>
            ))}
          </select>
        </div>

        {/* ポップアップ動画 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">ポップアップ動画</label>
          <select
            value={profile.popupVideoId ?? ''}
            onChange={(e) => setProfile({
              ...profile,
              popupVideoId: e.target.value ? Number(e.target.value) : null,
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">未設定</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>{v.originalFilename}</option>
            ))}
          </select>
        </div>

        {/* テーマカラー */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">テーマカラー</label>
          <input
            type="color"
            value={profile.themeColor}
            onChange={(e) => setProfile({ ...profile, themeColor: e.target.value })}
            className="h-10 w-20 cursor-pointer rounded border border-gray-300"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  );
}
