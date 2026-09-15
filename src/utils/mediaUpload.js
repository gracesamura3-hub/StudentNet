import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

function normalizePickedAsset(asset) {
  if (!asset) return null;
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    uri: asset.uri,
    name: asset.name || 'upload',
    type: asset.mimeType || asset.type || 'application/octet-stream',
    size: asset.size || 0,
    uploadedUrl: asset.uri,
  };
}

export async function pickImageAsset() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera roll access is required to upload a photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.82,
  });

  if (result.canceled || !result.assets?.length) return null;
  return normalizePickedAsset(result.assets[0]);
}

export async function pickDocumentAsset() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  const [asset] = result.assets;
  return normalizePickedAsset({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType || 'application/octet-stream',
    size: asset.size || 0,
  });
}

export async function uploadMediaAsset(file, folder = 'studentnet') {
  if (!file?.uri) return file;

  if (!storage) {
    return { ...file, uploadedUrl: file.uri };
  }

  const response = await fetch(file.uri);
  const blob = await response.blob();
  const safeName = String(file.name || 'upload').replace(/\s+/g, '-');
  const fileRef = ref(storage, `${folder}/${Date.now()}-${safeName}`);
  await uploadBytes(fileRef, blob, { contentType: file.type || 'application/octet-stream' });
  const url = await getDownloadURL(fileRef);

  return { ...file, uploadedUrl: url };
}
