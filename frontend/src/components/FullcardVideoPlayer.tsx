import { useRef, useEffect, useState } from 'react';

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
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play();
      setPlaying(true);
    } else if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.load();
      setPlaying(false);
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

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  // 動画終了時に停止状態にする
  const handleEnded = () => {
    setPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black">
      {/* 閉じるボタン */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 動画 */}
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        playsInline
        onClick={togglePlay}
        onEnded={handleEnded}
      />

      {/* 停止時: 再生ボタン */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
            style={{ backgroundColor: themeColor }}
          >
            <svg className="ml-1 h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* 再生中: 下部グラデーションヒント */}
      {playing && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-center rounded-b-3xl pb-4"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }}
        >
          <span className="text-xs text-white/70">クリックで停止</span>
        </div>
      )}
    </div>
  );
}
