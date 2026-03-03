import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

// テーマカラープリセット
const THEME_COLORS = [
  { color: '#667eea', label: 'インディゴ' },
  { color: '#f5576c', label: 'ローズ' },
  { color: '#4facfe', label: 'スカイ' },
  { color: '#2563EB', label: 'ブルー' },
  { color: '#059669', label: 'エメラルド' },
  { color: '#a855f7', label: 'パープル' },
  { color: '#f97316', label: 'オレンジ' },
  { color: '#1D1D1F', label: 'ブラック' },
];

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

  const biographyRemaining = 1000 - (profile.biography || '').length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
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

      <h1 className="mb-8 text-2xl font-bold text-gray-900">プロフィール編集</h1>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6">
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
          <label className="mb-1 block text-sm font-medium text-gray-700">経歴・自己紹介</label>
          <textarea
            value={profile.biography || ''}
            onChange={(e) => setProfile({ ...profile, biography: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={6}
            maxLength={1000}
          />
          <p className="mt-1 text-sm text-gray-500">残り {biographyRemaining} 文字</p>
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
          <span className="mb-3 block text-xs text-gray-400">公開ページのカード枠とサムネイル枠に反映されます</span>
          <div className="flex flex-wrap gap-3">
            {THEME_COLORS.map(({ color, label }) => (
              <button
                key={color}
                type="button"
                title={label}
                onClick={() => setProfile({ ...profile, themeColor: color })}
                className={`h-9 w-9 rounded-full transition-transform ${
                  profile.themeColor === color
                    ? 'scale-110 ring-2 ring-gray-400 ring-offset-2'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-full border border-gray-200"
              style={{ backgroundColor: profile.themeColor }}
            />
            <span className="text-xs text-gray-500">
              {THEME_COLORS.find((c) => c.color === profile.themeColor)?.label ?? profile.themeColor}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#1D1D1F' }}
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  );
}
