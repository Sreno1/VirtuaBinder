import type { ScanAsset } from '../types';

export function scanOptionLabel(asset: ScanAsset) {
  const side = asset.side === 'unspecified' ? '' : `, ${asset.side}`;
  return `${asset.name} (${asset.role}${side})`;
}
