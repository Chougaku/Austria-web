/** 卡片封面照片：一張就滿版；多張可以左右滑，角落標張數。 */
export default function Cover({ urls, alt }: { urls: string[]; alt: string }) {
  if (urls.length === 0) return null;
  return (
    <div className="cover-wrap">
      <div className="cover">
        {urls.map((u, i) => <img key={u} src={u} alt={i === 0 ? alt : `${alt}（第 ${i + 1} 張）`} loading="lazy" />)}
      </div>
      {urls.length > 1 && <span className="cover-count" aria-hidden="true">{urls.length} 張</span>}
    </div>
  );
}
