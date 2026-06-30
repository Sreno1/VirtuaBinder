import type { ScanAsset, ScanRole, ScanSide, StagedImportCandidate } from '../types';
import { uid } from '../domain/id';

type StatusCallback = (message: string) => void;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function isImageName(name: string) {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function stagedToAsset(candidate: StagedImportCandidate): ScanAsset {
  return {
    id: uid('scan'),
    name: candidate.name,
    source: candidate.source,
    pageNumber: candidate.pageNumber,
    role: candidate.role,
    side: candidate.side,
    image: candidate.image,
    width: candidate.width,
    height: candidate.height,
    createdAt: candidate.createdAt
  };
}

export async function importScanFiles(files: File[], onStatus: StatusCallback): Promise<ScanAsset[]> {
  return (await stageImportFiles(files, onStatus)).map(stagedToAsset);
}

export async function stageImportFiles(
  files: File[],
  onStatus: StatusCallback,
  defaults: Partial<Pick<StagedImportCandidate, 'role' | 'side'>> = {}
): Promise<StagedImportCandidate[]> {
  const imported: StagedImportCandidate[] = [];

  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      imported.push(...(await renderZip(file, onStatus, defaults)));
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      imported.push(...(await renderPdf(await file.arrayBuffer(), file.name, file.name, onStatus, defaults)));
    } else if (isImageName(file.name)) {
      onStatus(`Reading ${file.name}...`);
      imported.push(await renderImage(file, file.name, file.name, 1, defaults));
    }
  }

  return imported;
}

async function renderZip(
  file: File,
  onStatus: StatusCallback,
  defaults: Partial<Pick<StagedImportCandidate, 'role' | 'side'>>
) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && (entry.name.toLowerCase().endsWith('.pdf') || isImageName(entry.name))
  );
  const imported: StagedImportCandidate[] = [];

  for (const entry of entries) {
    const displayName = entry.name.split('/').pop() ?? entry.name;
    if (entry.name.toLowerCase().endsWith('.pdf')) {
      onStatus(`Rendering ${entry.name} from ${file.name}...`);
      imported.push(...(await renderPdf(await entry.async('arraybuffer'), displayName, file.name, onStatus, defaults)));
    } else {
      onStatus(`Reading ${entry.name} from ${file.name}...`);
      imported.push(await renderImage(await entry.async('blob'), displayName, file.name, 1, defaults));
    }
  }

  return imported;
}

async function renderPdf(
  buffer: ArrayBuffer,
  name: string,
  source: string,
  onStatus: StatusCallback,
  defaults: Partial<Pick<StagedImportCandidate, 'role' | 'side'>>
) {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const imported: StagedImportCandidate[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onStatus(`Rendering ${name}, page ${pageNumber} of ${pdf.numPages}...`);
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1500 / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is not available in this browser.');

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;

    imported.push({
      id: uid('candidate'),
      name: pdf.numPages > 1 ? `${name} p.${pageNumber}` : name,
      source,
      pageNumber,
      role: defaults.role ?? 'binder',
      side: defaults.side ?? 'unspecified',
      image: canvas.toDataURL('image/jpeg', 0.9),
      width: canvas.width,
      height: canvas.height,
      createdAt: Date.now()
    });
  }

  return imported;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the selected image.'));
    image.src = src;
  });
}

async function renderImage(
  blob: Blob,
  name: string,
  source: string,
  pageNumber: number,
  defaults: Partial<Pick<StagedImportCandidate, 'role' | 'side'>>
): Promise<StagedImportCandidate> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is not available in this browser.');

    const scale = Math.min(1, 1800 / image.naturalWidth);
    canvas.width = Math.max(1, Math.floor(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.floor(image.naturalHeight * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      id: uid('candidate'),
      name,
      source,
      pageNumber,
      role: defaults.role ?? 'binder',
      side: defaults.side ?? 'unspecified',
      image: canvas.toDataURL('image/jpeg', 0.9),
      width: canvas.width,
      height: canvas.height,
      createdAt: Date.now()
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
