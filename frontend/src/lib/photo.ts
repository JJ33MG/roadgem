/** Shrinks a camera photo to at most `max` px and re-encodes it as JPEG; this also drops the
 *  file's hidden data (EXIF, including the exact GPS position of the phone). */
export async function shrinkPhoto(file: File, max = 1600): Promise<string> {
  if (!/^image\//.test(file.type)) throw new Error('Choose a photo.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot prepare the photo.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}
