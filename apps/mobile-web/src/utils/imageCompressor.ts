import * as ImageManipulator from 'expo-image-manipulator';

const MAX_IMAGE_WIDTH = 1024;
const COMPRESSION_QUALITY = 0.7;

/**
 * Compresses an image client-side before upload to save bandwidth and storage.
 * @param uri The local URI of the image to compress
 * @returns The new local URI of the compressed image
 */
export const compressImage = async (uri: string): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_WIDTH } }], // Maintain aspect ratio
      { compress: COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Fallback to original URI if compression fails
    return uri;
  }
};
