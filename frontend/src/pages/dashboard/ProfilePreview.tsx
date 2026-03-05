import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import VideoThumbnail from '../../components/VideoThumbnail';
import FullcardVideoPlayer from '../../components/FullcardVideoPlayer';

interface ProfileData {
  name: string;
  biography: string | null;
  themeColor: string;
  thumbnailVideo: { encodedPath: string } | null;
  popupVideo: { encodedPath: string; status: string } | null;
}

export default function ProfilePreview() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [thumbVisible, setThumbVisible] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/profiles/me')
      .then((res) => setProfile(res.data.data))
      .catch(() => setError('プロフィールの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  // ポップアップ動画state machine（PublicProfile と同一）
  const openPopup = useCallback(() => {
    setThumbVisible(false);
    setTimeout(() => {
      setPopupOpen(true);
    }, 160);
  }, []);

  const closePopup = useCallback(() => {
    setPopupOpen(false);
    setTimeout(() => {
      setThumbVisible(true);
    }, 220);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F5F5F7' }}>
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F5F5F7' }}>
        <div className="text-gray-500">{error || 'プロフィールが見つかりません'}</div>
      </div>
    );
  }

  const themeColor = profile.themeColor || '#667eea';
  const hasPopupVideo = profile.popupVideo && profile.popupVideo.status === 'completed';
  const thumbnailVideoUrl = profile.thumbnailVideo
    ? `/api/storage/${profile.thumbnailVideo.encodedPath}`
    : null;
  const popupVideoUrl = hasPopupVideo
    ? `/api/storage/${profile.popupVideo!.encodedPath}`
    : null;

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: '#F5F5F7' }}>
      <div className="mx-auto max-w-2xl">
        {/* プレビューバナー */}
        <div
          className="mb-4 flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: '#F0FDF4', color: '#1D1D1F' }}
        >
          <div className="flex items-center gap-2.5">
            <svg className="h-4 w-4 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">プレビュー表示中（他のユーザーには表示されません）</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/profile/edit"
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150"
              style={{ border: '1px solid #D1D5DB', color: '#1D1D1F' }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#9CA3AF'; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB'; }}
            >
              編集に戻る
            </Link>
            <a
              href={`/users/${user?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150"
              style={{ backgroundColor: '#1D1D1F', color: '#ffffff' }}
            >
              公開ページを見る
            </a>
          </div>
        </div>

        {/* プロフィールカード（PublicProfile と同じ見た目） */}
        <div
          className="relative overflow-hidden rounded-3xl border-2 bg-white p-8 md:p-10"
          style={{ borderColor: themeColor }}
        >
          {/* 通常コンテンツ */}
          <div
            className="transition-opacity duration-200"
            style={{ opacity: thumbVisible ? 1 : 0, pointerEvents: thumbVisible ? 'auto' : 'none' }}
          >
            {/* 氏名 */}
            <h1
              className="mb-6 text-4xl font-extrabold md:text-5xl"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1D1D1F', letterSpacing: '-0.02em' }}
            >
              {profile.name || 'ユーザー名未設定'}
            </h1>

            {/* 経歴 */}
            <div className="min-h-[30vh] border-t border-gray-100 pt-6">
              {profile.biography ? (
                <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-600">
                  {profile.biography}
                </p>
              ) : (
                <p className="text-sm italic text-gray-300">経歴が設定されていません</p>
              )}
            </div>

            {/* サムネイル動画エリア */}
            {thumbnailVideoUrl && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <div className="flex justify-end">
                  <VideoThumbnail
                    src={thumbnailVideoUrl}
                    popupVideoSrc={popupVideoUrl || undefined}
                    size="md"
                    themeColor={themeColor}
                    onOpenPopup={hasPopupVideo ? openPopup : undefined}
                  />
                </div>
              </div>
            )}
          </div>

          {/* フルカード動画プレーヤー */}
          {popupVideoUrl && (
            <FullcardVideoPlayer
              src={popupVideoUrl}
              themeColor={themeColor}
              isOpen={popupOpen}
              onClose={closePopup}
            />
          )}
        </div>

      </div>
    </div>
  );
}
