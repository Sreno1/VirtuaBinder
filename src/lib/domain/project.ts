import type { AppState, BinderItem, BinderPage, PageTemplate } from '../types';
import { uid } from './id';
import { createGridTemplate } from './templates';

export function defaultState(): AppState {
  return {
    version: 1,
    assets: [],
    templates: [createGridTemplate()],
    pages: [],
    items: [],
    updatedAt: Date.now()
  };
}

export function itemForSlot(items: BinderItem[], pageId: string, slotId: string) {
  return items.find((item) => item.kind === 'slot' && item.pageId === pageId && item.slotId === slotId);
}

export function normalizeProject(state: AppState): AppState {
  return {
    ...state,
    items: state.items.map((item) => ({
      ...item,
      kind: item.kind ?? 'slot',
      gallery: item.gallery ?? []
    }))
  };
}

export function ensureItemsForPage(state: AppState, page: BinderPage): AppState {
  const template = state.templates.find((candidate) => candidate.id === page.templateId);
  if (!template) return state;

  const additions = template.slots
    .filter((slot) => !itemForSlot(state.items, page.id, slot.id))
    .map((slot) => ({
      id: uid('item'),
      kind: 'slot' as const,
      pageId: page.id,
      slotId: slot.id,
      title: `${page.title} slot ${slot.label}`,
      date: '',
      people: '',
      notes: ''
    }));

  return additions.length ? { ...state, items: [...state.items, ...additions] } : state;
}

export function slotLabelForItem(item: BinderItem, pages: BinderPage[], templates: PageTemplate[]) {
  if (item.kind !== 'slot' || !item.pageId || !item.slotId) return '';
  const page = pages.find((candidate) => candidate.id === item.pageId);
  const template = templates.find((candidate) => candidate.id === page?.templateId);
  return template?.slots.find((slot) => slot.id === item.slotId)?.label ?? '';
}
