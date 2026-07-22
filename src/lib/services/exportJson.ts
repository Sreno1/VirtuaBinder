import type { AppState } from '../types';
import { blobToDataUrl, getBlobById } from './storage';

async function resolveImage(id: string): Promise<string> {
  const blob = await getBlobById(id);
  return blob ? blobToDataUrl(blob) : '';
}

export async function exportStateJson(state: AppState) {
  const assets = await Promise.all(
    state.assets.map(async (asset) => ({ ...asset, image: await resolveImage(asset.id) }))
  );
  const items = await Promise.all(
    state.items.map(async (item) => {
      if (!item.gallery?.length) return item;
      const gallery = await Promise.all(
        item.gallery.map(async (photo) => ({ ...photo, image: await resolveImage(photo.id) }))
      );
      return { ...item, gallery };
    })
  );
  const exportable: AppState = { ...state, assets, items };

  const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `virtuabinder-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function parseStateJson(file: File): Promise<AppState> {
  const parsed = JSON.parse(await file.text()) as AppState;
  if (parsed.version !== 1 || !Array.isArray(parsed.assets) || !Array.isArray(parsed.templates)) {
    throw new Error('That file does not look like a VirtuaBinder export.');
  }
  return parsed;
}
