import type { PageTemplate, SlotTemplate } from '../types';
import { uid } from './id';

export function createGridTemplate(): PageTemplate {
  const slots: SlotTemplate[] = [];
  const gap = 2.2;
  const marginX = 3.4;
  const marginY = 3.2;
  const w = (100 - marginX * 2 - gap * 2) / 3;
  const h = (100 - marginY * 2 - gap * 2) / 3;

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      slots.push({
        id: uid('slot'),
        label: `${row * 3 + col + 1}`,
        x: marginX + col * (w + gap),
        y: marginY + row * (h + gap),
        w,
        h
      });
    }
  }

  return { id: uid('template'), name: 'Trading card page 3x3', slots };
}

export function createPhotoTemplate(): PageTemplate {
  return {
    id: uid('template'),
    name: 'Photo sleeve 2x2',
    slots: [
      { id: uid('slot'), label: '1', x: 5, y: 4, w: 42, h: 44 },
      { id: uid('slot'), label: '2', x: 53, y: 4, w: 42, h: 44 },
      { id: uid('slot'), label: '3', x: 5, y: 52, w: 42, h: 44 },
      { id: uid('slot'), label: '4', x: 53, y: 52, w: 42, h: 44 }
    ]
  };
}

export function createBlankTemplate(): PageTemplate {
  return { id: uid('template'), name: 'New stencil', slots: [] };
}

export function duplicateTemplate(template: PageTemplate): PageTemplate {
  return {
    id: uid('template'),
    name: `${template.name} copy`,
    slots: template.slots.map((slot) => ({ ...slot, id: uid('slot') }))
  };
}
