import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import VideoThumbnail from '../../components/VideoThumbnail';
import FullcardVideoPlayer from '../../components/FullcardVideoPlayer';

interface ProfileData {
  name: string;
  biography: string | null;
  themeColor: string;
  thumbnailVideo: { encodedPath: string } | null;
  popupVideo: { encodedPath: string; status: string } | null;
}

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [thumbVisible, setThumbVisible] = useState(true);

  useEffect(() => {
    api.get(`/users/${id}/profile`)
      .then((res) => setProfile(res.data.data))
      .catch(() => setError('プロフィールが見つかりません'))
      .finally(() => setLoading(false));
  }, [id]);

  // ポップアップ動画state machine（タイミング値はLaravel版と同一）
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
        {/* プロフィールカード */}
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

        {/* 管理ページリンク */}
        <div className="mt-4 text-right">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors duration-150 hover:text-gray-700"
          >
            管理ページへ
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
