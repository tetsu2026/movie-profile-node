import { useRef } from 'react';

interface VideoThumbnailProps {
  src: string;
  popupVideoSrc?: string;
  inline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  themeColor?: string;
  onOpenPopup?: () => void;
}

const sizeClasses = {
  sm: 'w-24 h-24',
  md: 'w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32',
  lg: 'w-40 h-40',
};

/**
 * 動画サムネイルコンポーネント
 * ホバー時に再生、クリックでポップアップ動画を開く
 */
export default function VideoThumbnail({
  src,
  popupVideoSrc,
  inline = false,
  size = 'md',
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

  const sizeClass = inline ? 'h-20 w-20' : sizeClasses[size];

  return (
    <div
      className={`${sizeClass} cursor-pointer overflow-hidden rounded-full shadow-lg transition-transform duration-200 hover:scale-105`}
      style={{ borderColor: themeColor, borderWidth: '4px', borderStyle: 'solid' }}
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
