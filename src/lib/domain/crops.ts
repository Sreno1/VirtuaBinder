import type { ScanAsset } from '../types';
import { clamp, round, uid } from './id';

export type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the selected scan image.'));
    image.src = src;
  });
}

export async function cropScanAsset(asset: ScanAsset, rect: CropRect, name: string): Promise<ScanAsset> {
  const image = await loadImage(asset.image);
  const sourceWidth = image.naturalWidth || asset.width;
  const sourceHeight = image.naturalHeight || asset.height;
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

  return {
    id: uid('scan'),
    name,
    source: `${asset.name} crop`,
    pageNumber: asset.pageNumber,
    role: 'item',
    side: 'unspecified',
    image: canvas.toDataURL('image/jpeg', 0.92),
    width: round(canvas.width),
    height: round(canvas.height),
    createdAt: Date.now()
  };
}
