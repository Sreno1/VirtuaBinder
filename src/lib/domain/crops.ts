import { clamp, round } from './id';

export type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CropSource = {
  image: string;
  width: number;
  height: number;
};

export type CroppedImage = {
  blob: Blob;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the selected scan image.'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode the cropped image.'))), 'image/jpeg', quality);
  });
}

export async function cropScanAsset(source: CropSource, rect: CropRect): Promise<CroppedImage> {
  const image = await loadImage(source.image);
  const sourceWidth = image.naturalWidth || source.width;
  const sourceHeight = image.naturalHeight || source.height;
  const sx = Math.floor((clamp(rect.x, 0, 100) / 100) * sourceWidth);
  const sy = Math.floor((clamp(rect.y, 0, 100) / 100) * sourceHeight);
  const sw = Math.max(1, Math.floor((clamp(rect.w, 0, 100) / 100) * sourceWidth));
  const sh = Math.max(1, Math.floor((clamp(rect.h, 0, 100) / 100) * sourceHeight));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is not available in this browser.');

  canvas.width = Math.min(sw, sourceWidth - sx);
  canvas.height = Math.min(sh, sourceHeight - sy);
  context.drawImage(image, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

  return { blob: await canvasToBlob(canvas), width: round(canvas.width), height: round(canvas.height) };
}
