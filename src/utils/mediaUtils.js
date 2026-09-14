export function makeClientSideThumbnailUri(uri, size = 1280) {
  if (!uri) return null;
  return {
    uri,
    width: size,
    height: size,
    mimeType: 'image/jpeg',
    quality: 0.72,
  };
}

export async function compressMediaForUpload(uri, quality = 0.72) {
  if (!uri) return null;
  return {
    uri,
    mimeType: 'image/jpeg',
    quality,
    compressed: true,
  };
}
