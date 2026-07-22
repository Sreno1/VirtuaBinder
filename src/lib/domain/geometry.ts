import type { SlotTemplate } from '../types';
import { round } from './id';

export function slotPositionStyle(slot: SlotTemplate, mirrored = false) {
  const x = mirrored ? 100 - slot.x - slot.w : slot.x;
  return `left:${round(x)}%;top:${slot.y}%;width:${slot.w}%;height:${slot.h}%;`;
}

// Compensates for the binder rings/tabs along the scan's bound edge, which eat into the
// scanned image without being reflected in the template's slot coordinates. Preview-only:
// the editor views must keep showing the true, unmodified slot rectangles.
const RING_OFFSET_X = 2;
const RING_OFFSET_Y = 1.5;

export function previewSlotPositionStyle(slot: SlotTemplate, mirrored = false) {
  const x = (mirrored ? 100 - slot.x - slot.w : slot.x) + (mirrored ? -RING_OFFSET_X : RING_OFFSET_X);
  const y = slot.y + RING_OFFSET_Y;
  return `left:${round(x)}%;top:${round(y)}%;width:${slot.w}%;height:${slot.h}%;`;
}
