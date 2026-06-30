import type { SlotTemplate } from '../types';
import { round } from './id';

export function slotPositionStyle(slot: SlotTemplate, mirrored = false) {
  const x = mirrored ? 100 - slot.x - slot.w : slot.x;
  return `left:${round(x)}%;top:${slot.y}%;width:${slot.w}%;height:${slot.h}%;`;
}
