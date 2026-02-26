import { useRef, useEffect } from 'react';

interface FullcardVideoPlayerProps {
  src: string;
  themeColor?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * フルカード動画プレーヤー
 * プロフィールカード内でオーバーレイ表示する動画プレーヤー
 */
export default function FullcardVideoPlayer({
  src,
  themeColor = '#667eea',
  isOpen,
  onClose,
}: FullcardVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play();
    } else if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.load();
    }
  }, [isOpen]);

  // Escapeキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/90">
      {/* 閉じるボタン */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded-full p-2 text-white/70 transition-colors hover:text-white"
        style={{ backgroundColor: `${themeColor}33` }}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <video
        ref={videoRef}
        src={src}
        className="max-h-full max-w-full rounded-2xl"
        controls
        playsInline
      />
    </div>
  );
}
