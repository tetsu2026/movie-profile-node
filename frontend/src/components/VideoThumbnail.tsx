import { useRef } from 'react';

interface VideoThumbnailProps {
  src: string;
  popupVideoSrc?: string;
  inline?: boolean;
  themeColor?: string;
  onOpenPopup?: () => void;
}

/**
 * 動画サムネイルコンポーネント
 * ホバー時に再生、クリックでポップアップ動画を開く
 */
export default function VideoThumbnail({
  src,
  popupVideoSrc,
  inline = false,
  themeColor = '#667eea',
  onOpenPopup,
}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleMouseEnter = () => {
    videoRef.current?.play();
  };

  const handleMouseLeave = () => {
    videoRef.current?.pause();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleClick = () => {
    if (popupVideoSrc && onOpenPopup) {
      onOpenPopup();
    }
  };

  const sizeClass = inline ? 'h-20 w-20' : 'h-32 w-32';

  return (
    <div
      className={`${sizeClass} cursor-pointer overflow-hidden rounded-xl transition-transform duration-200 hover:scale-105`}
      style={{ borderColor: themeColor, borderWidth: '2px' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
      />
    </div>
  );
}
