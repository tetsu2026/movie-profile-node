import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoThumbnail from '../VideoThumbnail';

describe('VideoThumbnail', () => {
  it('video要素がレンダリングされる', () => {
    const { container } = render(
      <VideoThumbnail src="/test-video.mp4" />,
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/test-video.mp4');
  });

  it('デフォルトサイズは h-32 w-32', () => {
    const { container } = render(
      <VideoThumbnail src="/test-video.mp4" />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('h-32');
    expect(wrapper.className).toContain('w-32');
  });

  it('inline=true で h-20 w-20 になる', () => {
    const { container } = render(
      <VideoThumbnail src="/test-video.mp4" inline />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('h-20');
    expect(wrapper.className).toContain('w-20');
  });

  it('themeColor がボーダーカラーに反映される', () => {
    const { container } = render(
      <VideoThumbnail src="/test-video.mp4" themeColor="#ff5500" />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.borderColor).toBe('rgb(255, 85, 0)');
  });

  it('クリック時にonOpenPopupが呼ばれる', () => {
    const onOpenPopup = vi.fn();

    const { container } = render(
      <VideoThumbnail
        src="/test-video.mp4"
        popupVideoSrc="/popup.mp4"
        onOpenPopup={onOpenPopup}
      />,
    );

    fireEvent.click(container.firstChild as HTMLElement);
    expect(onOpenPopup).toHaveBeenCalledTimes(1);
  });

  it('popupVideoSrcがない場合はクリックしてもonOpenPopupが呼ばれない', () => {
    const onOpenPopup = vi.fn();

    const { container } = render(
      <VideoThumbnail src="/test-video.mp4" onOpenPopup={onOpenPopup} />,
    );

    fireEvent.click(container.firstChild as HTMLElement);
    expect(onOpenPopup).not.toHaveBeenCalled();
  });
});
