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

/**
 * Decode a large phone photograph once, then run object detection on a much
 * smaller image. Original bytes remain unchanged for archival storage; the
 * box mapper converts detector coordinates back to that original photo.
 */
export async function prepareDetectionImage(source: Blob, maxEdge = 960): Promise<{
  image: Blob;
  scaleX: number;
  scaleY: number;
  resized: boolean;
}> {
  const bitmap = await createImageBitmap(source);
  try {
    const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (ratio >= 1) return { image: source, scaleX: 1, scaleY: 1, resized: false };

    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable.');
    context.drawImage(bitmap, 0, 0, width, height);
    const image = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error('Could not resize detection photo.')),
        'image/jpeg',
        0.86,
      );
    });
    return {
      image,
      scaleX: bitmap.width / width,
      scaleY: bitmap.height / height,
      resized: true,
    };
  } finally {
    bitmap.close();
  }
}
