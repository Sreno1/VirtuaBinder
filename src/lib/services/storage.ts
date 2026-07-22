import type { AppState, BinderItem, GalleryPhoto, ScanAsset } from '../types';

export const DB_NAME = 'timeline-binder-db';
export const STATE_KEY = 'active-state';

const LEGACY_STORE_NAME = 'documents';
const PROJECT_STORE_NAME = 'project';
const BLOB_STORE_NAME = 'blobs';
const DB_VERSION = 2;

type SlimAsset = Omit<ScanAsset, 'image'>;
type SlimGalleryPhoto = Omit<GalleryPhoto, 'image'>;
type SlimItem = Omit<BinderItem, 'gallery'> & { gallery?: SlimGalleryPhoto[] };
type SlimProject = Omit<AppState, 'assets' | 'items'> & { assets: SlimAsset[]; items: SlimItem[] };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) db.createObjectStore(PROJECT_STORE_NAME);
        if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) db.createObjectStore(BLOB_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function runTx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = run(tx.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function stripImage<T extends { image: string }>({ image, ...rest }: T): Omit<T, 'image'> {
  return rest;
}

// --- Blob <-> data URL conversion (only needed at the JSON export/import boundary) ---

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image data.'));
    reader.readAsDataURL(blob);
  });
}

// --- Blob store CRUD ---

/** Persists a blob (keyed by asset/photo id) and returns a fresh object URL for immediate use. */
export async function saveBlob(id: string, blob: Blob): Promise<string> {
  const db = await openDatabase();
  await runTx(db, BLOB_STORE_NAME, 'readwrite', (store) => store.put(blob, id));
  return URL.createObjectURL(blob);
}

export async function getBlobById(id: string): Promise<Blob | undefined> {
  const db = await openDatabase();
  return runTx(db, BLOB_STORE_NAME, 'readonly', (store) => store.get(id));
}

export async function deleteBlobs(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(BLOB_STORE_NAME);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Hydration: slim (on-disk) <-> full (in-memory, object-URL-backed) ---

async function hydrateAsset(db: IDBDatabase, asset: SlimAsset): Promise<ScanAsset> {
  const blob = await runTx(db, BLOB_STORE_NAME, 'readonly', (store) => store.get(asset.id));
  return { ...asset, image: blob ? URL.createObjectURL(blob) : '' };
}

async function hydrateGalleryPhoto(db: IDBDatabase, photo: SlimGalleryPhoto): Promise<GalleryPhoto> {
  const blob = await runTx(db, BLOB_STORE_NAME, 'readonly', (store) => store.get(photo.id));
  return { ...photo, image: blob ? URL.createObjectURL(blob) : '' };
}

async function hydrateProject(db: IDBDatabase, slim: SlimProject): Promise<AppState> {
  const assets = await Promise.all(slim.assets.map((asset) => hydrateAsset(db, asset)));
  const items = await Promise.all(
    slim.items.map(async (item): Promise<BinderItem> => {
      if (!item.gallery?.length) return item as BinderItem;
      const gallery = await Promise.all(item.gallery.map((photo) => hydrateGalleryPhoto(db, photo)));
      return { ...item, gallery };
    })
  );
  return { ...slim, assets, items };
}

// --- One-time migration from the v1 schema (whole state, base64 images, single key) ---

async function migrateLegacyState(db: IDBDatabase, legacy: AppState): Promise<SlimProject> {
  const assetBlobs = await Promise.all(
    legacy.assets.map(async (asset) => ({ id: asset.id, blob: await dataUrlToBlob(asset.image) }))
  );
  const galleryBlobs: { id: string; blob: Blob }[] = [];
  const items: SlimItem[] = [];
  for (const item of legacy.items) {
    if (!item.gallery?.length) {
      items.push(item as SlimItem);
      continue;
    }
    const gallery = await Promise.all(
      item.gallery.map(async (photo) => {
        galleryBlobs.push({ id: photo.id, blob: await dataUrlToBlob(photo.image) });
        return stripImage(photo);
      })
    );
    items.push({ ...item, gallery });
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(BLOB_STORE_NAME);
    for (const entry of [...assetBlobs, ...galleryBlobs]) store.put(entry.blob, entry.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const slim: SlimProject = { ...legacy, assets: legacy.assets.map(stripImage), items };
  await runTx(db, PROJECT_STORE_NAME, 'readwrite', (store) => store.put(slim, STATE_KEY));

  // The legacy store is left untouched (not deleted) as a safety net in case
  // anything above was wrong — it costs disk space but never risks data loss.
  return slim;
}

export async function loadStoredState(): Promise<AppState | null> {
  const db = await openDatabase();
  let slim = await runTx<SlimProject | undefined>(db, PROJECT_STORE_NAME, 'readonly', (store) => store.get(STATE_KEY));

  if (!slim && db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    const legacy = await runTx<AppState | undefined>(db, LEGACY_STORE_NAME, 'readonly', (store) => store.get(STATE_KEY));
    if (legacy) slim = await migrateLegacyState(db, legacy);
  }

  if (!slim) return null;
  return hydrateProject(db, slim);
}

export async function saveStoredState(project: AppState): Promise<void> {
  const db = await openDatabase();
  const slim: SlimProject = {
    ...project,
    assets: project.assets.map(stripImage),
    items: project.items.map((item): SlimItem => (item.gallery?.length ? { ...item, gallery: item.gallery.map(stripImage) } : (item as SlimItem)))
  };
  await runTx(db, PROJECT_STORE_NAME, 'readwrite', (store) => store.put(slim, STATE_KEY));
}

export async function clearStoredState(): Promise<void> {
  const db = await openDatabase();
  await Promise.all([
    runTx(db, PROJECT_STORE_NAME, 'readwrite', (store) => store.clear()),
    runTx(db, BLOB_STORE_NAME, 'readwrite', (store) => store.clear())
  ]);
}
