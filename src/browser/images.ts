import type { Detection } from '../ai/shared';

export async function cropImageBlob(
  source: Blob,
  box: Detection['box'],
  mimeType = 'image/jpeg',
  quality = 0.9,
): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    const sx = Math.max(0, Math.floor(box.xmin));
    const sy = Math.max(0, Math.floor(box.ymin));
    const sw = Math.min(bitmap.width - sx, Math.max(1, Math.ceil(box.xmax - box.xmin)));
    const sh = Math.min(bitmap.height - sy, Math.max(1, Math.ceil(box.ymax - box.ymin)));

    if (sw <= 0 || sh <= 0) throw new Error('Detected crop is empty.');

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable.');

    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode cat crop.'))),
        mimeType,
        quality,
      );
    });
  } finally {
    bitmap.close();
  }
}
