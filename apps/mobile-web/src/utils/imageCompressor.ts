import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compresses an image client-side before upload to save bandwidth and storage.
 * @param uri The local URI of the image to compress
 * @returns The new local URI of the compressed image
 */
export const compressImage = async (uri: string): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }], // Resize width to 1024px max, maintain aspect ratio
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 70% quality JPEG
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Fallback to original URI if compression fails
    return uri;
  }
};
