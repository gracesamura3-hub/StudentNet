import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const MAX_VIDEO_DURATION_SECONDS = 60;
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

export function openWebFilePicker({ accept, onFile }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    onFile({
      uri: URL.createObjectURL(file),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      file,
    });
  };
  input.click();
  return true;
}

function assertVideoMetadata({ duration, size }) {
  if (Number.isFinite(duration) && duration > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error(`Videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter.`);
  }
  if (Number.isFinite(size) && size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error('Videos must be smaller than 50 MB before upload.');
  }
}

async function getFileSize(uri) {
  if (Platform.OS === 'web' || !uri) return null;
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return typeof info.size === 'number' ? info.size : null;
  } catch {
    return null;
  }
}

async function createWebThumbnail(uri) {
  if (typeof document === 'undefined') return { thumbnailUri: null, duration: null, width: null, height: null };
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = uri;
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = () => reject(new Error('The selected video could not be read.'));
  });
  const duration = Number.isFinite(video.duration) ? video.duration : null;
  const width = video.videoWidth || null;
  const height = video.videoHeight || null;
  assertVideoMetadata({ duration });
  video.currentTime = Math.min(0.1, Math.max(0, (duration || 1) / 2));
  await new Promise(resolve => { video.onseeked = resolve; });
  const canvas = document.createElement('canvas');
  const scale = width && height ? Math.min(1, 1280 / Math.max(width, height)) : 1;
  canvas.width = Math.max(1, Math.round((width || 640) * scale));
  canvas.height = Math.max(1, Math.round((height || 360) * scale));
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return { thumbnailUri: canvas.toDataURL('image/jpeg', 0.78), duration, width, height };
}

async function createNativeThumbnail(uri, metadata = {}) {
  const { getThumbnailAsync } = await import('expo-video-thumbnails');
  const thumbnail = await getThumbnailAsync(uri, { time: 0 });
  return {
    thumbnailUri: thumbnail.uri,
    duration: Number.isFinite(metadata.duration) ? metadata.duration : null,
    width: thumbnail.width || metadata.width || null,
    height: thumbnail.height || metadata.height || null,
  };
}

export async function preprocessVideo(assetOrUri, options = {}) {
  const asset = typeof assetOrUri === 'string' ? { uri: assetOrUri } : (assetOrUri || {});
  const videoUri = asset.uri;
  if (!videoUri) throw new Error('Choose a video before processing it.');
  const size = Number.isFinite(asset.fileSize) ? asset.fileSize : await getFileSize(videoUri);
  const duration = Number.isFinite(asset.duration) ? asset.duration / (asset.duration > 1000 ? 1000 : 1) : null;
  assertVideoMetadata({ duration, size });

  const generated = Platform.OS === 'web'
    ? await createWebThumbnail(videoUri)
    : await createNativeThumbnail(videoUri, { duration, width: asset.width, height: asset.height });
  const finalDuration = generated.duration ?? duration;
  assertVideoMetadata({ duration: finalDuration, size });

  return {
    videoUri,
    thumbnailUri: generated.thumbnailUri,
    duration: finalDuration,
    width: generated.width || asset.width || null,
    height: generated.height || asset.height || null,
    size,
    compressed: false,
    quality: options.quality || 0.78,
  };
}

export function makeClientSideThumbnailUri(uri, size = 1280) {
  if (!uri) return null;
  return { uri, width: size, height: size, mimeType: 'image/jpeg', quality: 0.72 };
}

export async function compressMediaForUpload(uri, quality = 0.72) {
  if (!uri) return null;
  return { uri, mimeType: 'image/jpeg', quality, compressed: true };
}
