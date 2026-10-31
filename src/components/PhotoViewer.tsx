import Gallery from './Gallery';
import Modal from './Modal';

/** 全螢幕看照片：左右滑或方向鍵換張，Esc／✕／點旁邊關閉。 */
export default function PhotoViewer({ urls, alt, start = 0, onClose }: {
  urls: string[];
  alt: string;
  start?: number;
  onClose: () => void;
}) {
  return (
    <Modal label="照片" onClose={onClose} className="modal--photos" backdropClassName="modal-backdrop--photos">
      <Gallery urls={urls} alt={alt} start={start} full keyboard />
    </Modal>
  );
}
