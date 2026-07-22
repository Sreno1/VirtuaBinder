import type { AppState } from '../types';

export function exportStateJson(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
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
