export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PHOTO_SIZE = 400;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Crops the selected square and resizes it to 400×400 in the browser.
 * WebP (~20–40 KB) when the browser can encode it; JPEG otherwise (older
 * Safari). The original file is never uploaded.
 */
export async function cropAndResize(
  src: string,
  area: CropArea,
): Promise<{ blob: Blob; extension: 'webp' | 'jpg'; contentType: string }> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas not supported');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, PHOTO_SIZE, PHOTO_SIZE);

  const webp = await canvasToBlob(canvas, 'image/webp', 0.8);
  if (webp && webp.type === 'image/webp') {
    return { blob: webp, extension: 'webp', contentType: 'image/webp' };
  }
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.82);
  if (!jpeg) throw new Error('Could not encode image');
  return { blob: jpeg, extension: 'jpg', contentType: 'image/jpeg' };
}
