/**
 * Reads a local file:// URI back into a base64 data URI, using RN's built-in
 * fetch + FileReader rather than adding expo-file-system as a dependency.
 * Used to resume a queued photo upload after the app restarts, when only
 * the file path (not its bytes) survived in storage.
 */
export const readAsDataUri = (uri: string, mimeType: string): Promise<string> =>
  new Promise((resolve, reject) => {
    fetch(uri)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the saved photo.'));
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => reject(new Error(`Could not read the saved photo (data:${mimeType} unreachable).`)));
  });
