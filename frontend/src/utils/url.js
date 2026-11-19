const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const toAbsoluteUrl = (relativePath) => {
  if (!relativePath) {
    return '';
  }

  if (relativePath.startsWith('http') || relativePath.startsWith('https')) {
    if (relativePath.includes('res.cloudinary.com') || relativePath.includes('cloudinary.com')) {
      return relativePath;
    }

    try {
      const url = new URL(relativePath);
      const isLoopbackHost =
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '0.0.0.0';

      if (isLoopbackHost) {
        const baseUrl = API_URL.replace(/\/?api\/?$/, '');
        const uploadsIndex = url.pathname.indexOf('/uploads/');
        if (uploadsIndex !== -1) {
          const cleanPath = url.pathname
            .slice(uploadsIndex)
            .replace(/^\/uploads\//, '')
            .replace(/^uploads\//, '');
          return `${baseUrl}/uploads/${cleanPath}`;
        }
      }
    } catch {
      // Fall back to returning the original value
    }
    return relativePath;
  }

  if (relativePath.startsWith('data:image')) {
    return relativePath;
  }

  if (
    relativePath.startsWith('/uploads/') ||
    relativePath.startsWith('uploads/') ||
    relativePath.includes('profiles/') ||
    relativePath.includes('documents/') ||
    relativePath.includes('materials/') ||
    relativePath.includes('thumbnails/')
  ) {
    const baseUrl = API_URL.replace(/\/?api\/?$/, '');
    const cleanPath = relativePath.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
    return `${baseUrl}/uploads/${cleanPath}`;
  }

  return `${API_URL}${relativePath}`;
};

export const getVideoEmbedUrl = (inputUrl) => {
  if (!inputUrl) {
    return '';
  }

  const str = String(inputUrl).trim();
  if (!str) {
    return '';
  }

  // 1. YouTube regex match (handles watch?v=..., shorts/..., embed/..., youtu.be/..., and concatenated strings)
  const ytMatch = str.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&disablekb=0&playsinline=1`;
  }

  // 2. Vimeo regex match
  const vimeoMatch = str.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d{6,})/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // 3. Google Drive preview
  const driveMatch = str.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  const absoluteUrl = toAbsoluteUrl(str);
  const lower = absoluteUrl.toLowerCase();

  const isDirectVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/.test(lower);
  if (isDirectVideoFile) {
    return '';
  }

  try {
    const parsed = new URL(absoluteUrl);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    // YouTube fallback
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = parsed.searchParams.get('v');
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{6,})/);
      const embedMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{6,})/);
      const id = v || shortsMatch?.[1] || embedMatch?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    // Vimeo fallback
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const m = parsed.pathname.match(/\/(\d{6,})/);
      const id = m?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }
  } catch {
    // ignore parse errors
  }

  return '';
};
