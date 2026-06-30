import type { BinderItem, BinderPage, PreviewSide, PreviewSpreadSlot, ScanAsset } from '../types';

function looseItemSides(item: BinderItem, assets: ScanAsset[]): PreviewSide[] {
  return [
    {
      key: `${item.id}-front`,
      kind: 'loose' as const,
      item,
      side: 'front' as const,
      asset: assets.find((asset) => asset.id === item.frontScanId)
    },
    {
      key: `${item.id}-back`,
      kind: 'loose' as const,
      item,
      side: 'back' as const,
      asset: assets.find((asset) => asset.id === item.backScanId)
    }
  ];
}

function pageSides(page: BinderPage, assets: ScanAsset[]): PreviewSide[] {
  return [
    {
      key: `${page.id}-front`,
      kind: 'page' as const,
      page,
      side: 'front' as const,
      asset: assets.find((asset) => asset.id === page.frontScanId)
    },
    {
      key: `${page.id}-back`,
      kind: 'page' as const,
      page,
      side: 'back' as const,
      asset: assets.find((asset) => asset.id === page.backScanId)
    }
  ];
}

export function buildPreviewSides(pages: BinderPage[], items: BinderItem[], assets: ScanAsset[]): PreviewSide[] {
  const sides: PreviewSide[] = [];

  for (let insertIndex = 0; insertIndex <= pages.length; insertIndex += 1) {
    const looseItems = items
      .filter((item) => item.kind === 'loose' && (item.insertIndex ?? pages.length) === insertIndex)
      .sort((a, b) => (a.looseOrder ?? 0) - (b.looseOrder ?? 0));
    sides.push(...looseItems.flatMap((item) => looseItemSides(item, assets)));
    const page = pages[insertIndex];
    if (page) sides.push(...pageSides(page, assets));
  }

  return sides;
}

export function buildPreviewSpreads(sides: PreviewSide[]): PreviewSpreadSlot[][] {
  if (!sides.length) return [];

  const spreads: PreviewSpreadSlot[][] = [[null, sides[0]]];
  for (let index = 1; index < sides.length; index += 2) {
    spreads.push([sides[index], sides[index + 1] ?? null]);
  }
  return spreads;
}
