import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Capturing a photo without running the phone out of memory.
 *
 * Every capture in this app used to ask expo-image-picker for `base64: true`
 * at full camera resolution. On a modern phone that is fatal, and it was
 * killing the app mid-upload:
 *
 *   - this device's camera writes JPEGs of up to 34MB (50MP class)
 *   - decoding 50M pixels to a bitmap costs ~200MB (4 bytes per pixel)
 *   - the base64 string then costs another ~1.33x the compressed bytes
 *   - the app's Java heap cap (dalvik.vm.heapgrowthlimit) is 384MB
 *
 * So the bitmap alone nearly exhausted the heap, and Android killed the
 * process — which looks like the app "restarting" rather than an error.
 *
 * Resizing first fixes it at the source: a 1600px-wide image is ~2M pixels,
 * roughly a hundredth of the memory, and is still far more detail than any
 * of these photos need (evidence of work, a nameplate, a fare receipt).
 */

/** Wide enough to read a nameplate or a receipt, small enough to never threaten the heap. */
const MAX_DIMENSION = 1600;
const COMPRESSION = 0.6;

export interface CapturedPhoto {
  /** Local file URI of the resized copy — safe to show in an <Image>. */
  uri: string;
  /** `data:image/jpeg;base64,...`, ready to POST. */
  dataUri: string;
  mimeType: string;
}

/**
 * Resizes an already-picked asset and returns it as a data URI.
 *
 * Kept separate from the launchers below so the gallery path, which can
 * return several assets, can run them one at a time rather than holding
 * every full-size image in memory at once.
 */
export const compressAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<CapturedPhoto> => {
  const context = ImageManipulator.manipulate(asset.uri).resize({ width: MAX_DIMENSION });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: COMPRESSION,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new Error('That photo could not be prepared for upload. Try again.');
  }

  return {
    uri: result.uri,
    dataUri: `data:image/jpeg;base64,${result.base64}`,
    mimeType: 'image/jpeg',
  };
};

/**
 * Opens the camera and returns a resized photo, or null if the engineer
 * backed out. Never asks the picker for base64 — that is the whole point.
 */
export const capturePhoto = async (): Promise<CapturedPhoto | null> => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera access is off for this app. Enable it in your phone settings.');
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
  if (result.canceled) return null;

  return compressAsset(result.assets[0]);
};

/** Same, from the gallery. Returns every picked asset, resized one at a time. */
export const pickPhotos = async (limit: number): Promise<CapturedPhoto[]> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo access is off for this app. Enable it in your phone settings.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 1,
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
  });
  if (result.canceled) return [];

  const out: CapturedPhoto[] = [];
  // Sequential on purpose: resizing in parallel would put every full-size
  // bitmap in memory at the same moment, which is the crash this avoids.
  for (const asset of result.assets) {
    out.push(await compressAsset(asset));
  }
  return out;
};
