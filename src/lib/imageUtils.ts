export const getImageUrl = (url: string | null | undefined) => {
  if (!url) return null;
  if (url.startsWith('/') || url.startsWith('data:')) return url;
  
  // Logic: In development, try using the direct link if proxy is problematic.
  // In production, the proxy is usually necessary for external images.
  // However, we want consistency.
  
  // Detection for local preview in AI Studio or true local
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev'));

  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
};

export const handleImageError = (e: any, originalUrl: string | null | undefined) => {
  const target = e.target as HTMLImageElement;
  if (!originalUrl) return;

  // Use a secondary robust proxy (wsrv.nl) as a backup
  const backupProxy = `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&output=webp`;

  if (target.src === backupProxy) {
    if (target.src !== originalUrl) {
      target.src = originalUrl;
      target.referrerPolicy = "no-referrer";
    }
    return;
  }

  if (target.src.includes('/api/image-proxy')) {
    target.src = backupProxy;
    return;
  }
  
  target.src = originalUrl;
  target.referrerPolicy = "no-referrer";
};
