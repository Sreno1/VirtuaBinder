import { get, writable } from 'svelte/store';
import type {
  AppState,
  BinderItem,
  BinderPage,
  BinderStoreState,
  BinderUiState,
  LocationOption,
  PageTemplate,
  ScanAsset,
  ScanRole,
  ScanSide,
  StagedImportCandidate,
  SlotTemplate,
  Tab
} from '../types';
import { clamp, round, uid } from '../domain/id';
import { cropScanAsset, type CropRect } from '../domain/crops';
import { defaultState, ensureItemsForPage, itemForSlot, normalizeProject } from '../domain/project';
import { createBlankTemplate, createGridTemplate, createPhotoTemplate, duplicateTemplate } from '../domain/templates';
import { buildPreviewSides, buildPreviewSpreads } from '../domain/preview';
import { findLocationByInput, locationInputValue } from '../domain/locations';
import { exportStateJson, parseStateJson } from '../services/exportJson';
import { readGalleryPhotos } from '../services/importScans';
import { loadStoredState, saveStoredState } from '../services/storage';
import { applyTheme, loadStoredThemeId, saveThemeId } from '../theme/applyTheme';

function initialUi(project: AppState): BinderUiState {
  return {
    activeTab: 'booklet',
    theme: loadStoredThemeId(),
    ready: false,
    importStatus: '',
    importBusy: false,
    selectedTemplateId: project.templates[0]?.id ?? '',
    templatePreviewAssetId: '',
    selectedSlotId: '',
    activeBookletPageId: '',
    selectedItemId: '',
    shadowItemId: '',
    itemLocationSearch: '',
    itemLocationSearchItemId: '',
    itemLocationFocused: false,
    shadowLocationSearch: '',
    shadowLocationSearchItemId: '',
    shadowLocationFocused: false,
    showBack: false,
    previewIndex: 0,
    previewMode: 'double',
    previewBorders: true,
    shadowFlipped: false,
    shadowEditing: false
  };
}

const initialProject = defaultState();
const store = writable<BinderStoreState>({ project: initialProject, ui: initialUi(initialProject) });
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const ACTIVE_TAB_KEY = 'timeline-binder-active-tab';
const VALID_TABS: Tab[] = ['booklet', 'templates', 'preview', 'map', 'data'];

function loadActiveTab() {
  const tab = window.localStorage.getItem(ACTIVE_TAB_KEY);
  if (tab === 'import') return 'booklet';
  return tab && VALID_TABS.includes(tab as Tab) ? (tab as Tab) : 'booklet';
}

function saveActiveTab(tab: Tab) {
  window.localStorage.setItem(ACTIVE_TAB_KEY, tab);
}

function scheduleSave(project: AppState) {
  if (!get(store).ui.ready) return;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void saveStoredState(project);
  }, 350);
}

function setProject(project: AppState, persist = true) {
  const nextProject = persist ? { ...project, updatedAt: Date.now() } : project;
  store.update((current) => ({ ...current, project: nextProject }));
  if (persist) scheduleSave(nextProject);
}

function updateUi(patch: Partial<BinderUiState>) {
  store.update((current) => ({ ...current, ui: { ...current.ui, ...patch } }));
}

function patchProject(mutator: (project: AppState) => AppState) {
  setProject(mutator(get(store).project));
}

function updateItemById(id: string, patch: Partial<BinderItem>) {
  patchProject((project) => ({
    ...project,
    items: project.items.map((item) => (item.id === id ? { ...item, ...patch } : item))
  }));
}

function activeTemplate(project: AppState, ui: BinderUiState) {
  return project.templates.find((template) => template.id === ui.selectedTemplateId);
}

function activePage(project: AppState, ui: BinderUiState) {
  return project.pages.find((page) => page.id === ui.activeBookletPageId) ?? project.pages[0];
}

function setPageWithItems(project: AppState, page: BinderPage) {
  const nextProject = {
    ...project,
    pages: project.pages.map((candidate) => (candidate.id === page.id ? page : candidate))
  };
  return ensureItemsForPage(nextProject, page);
}

export const binderStore = {
  subscribe: store.subscribe,

  async initialize() {
    const stored = await loadStoredState();
    store.update((current) => {
      const project = normalizeProject(stored ?? current.project);
      return {
        project,
        ui: {
          ...current.ui,
          activeTab: loadActiveTab(),
          ready: true,
          selectedTemplateId: project.templates[0]?.id ?? '',
          activeBookletPageId: project.pages[0]?.id ?? '',
          templatePreviewAssetId: project.assets.find((asset) => asset.role === 'binder')?.id ?? ''
        }
      };
    });
  },

  destroy() {
    if (saveTimer) window.clearTimeout(saveTimer);
  },

  setActiveTab(activeTab: Tab) {
    saveActiveTab(activeTab);
    updateUi({ activeTab });
  },

  setTheme(theme: string) {
    applyTheme(theme);
    saveThemeId(theme);
    updateUi({ theme });
  },

  setSelectedTemplate(id: string) {
    updateUi({ selectedTemplateId: id, selectedSlotId: '' });
  },

  setTemplatePreviewAsset(id: string) {
    updateUi({ templatePreviewAssetId: id });
  },

  setSelectedSlot(id: string) {
    updateUi({ selectedSlotId: id });
  },

  setActiveBookletPage(id: string) {
    updateUi({ activeBookletPageId: id, selectedItemId: '' });
  },

  setActiveLooseItem(id: string) {
    updateUi({ activeBookletPageId: '', selectedItemId: id });
  },

  setShowBack(showBack: boolean) {
    updateUi({ showBack });
  },

  setPreviewBorders(previewBorders: boolean) {
    updateUi({ previewBorders });
  },

  setImportStatus(importStatus: string, importBusy = false) {
    updateUi({ importStatus, importBusy });
  },

  setAssetRole(id: string, role: ScanRole) {
    patchProject((project) => ({
      ...project,
      assets: project.assets.map((asset) => (asset.id === id ? { ...asset, role } : asset))
    }));
  },

  setAssetSide(id: string, side: ScanSide) {
    patchProject((project) => ({
      ...project,
      assets: project.assets.map((asset) => (asset.id === id ? { ...asset, side } : asset))
    }));
  },

  removeAsset(id: string) {
    patchProject((project) => ({
      ...project,
      assets: project.assets.filter((asset) => asset.id !== id),
      pages: project.pages.map((page) => ({
        ...page,
        frontScanId: page.frontScanId === id ? undefined : page.frontScanId,
        backScanId: page.backScanId === id ? undefined : page.backScanId
      })),
      items: project.items.map((item) => ({
        ...item,
        frontScanId: item.frontScanId === id ? undefined : item.frontScanId,
        backScanId: item.backScanId === id ? undefined : item.backScanId
      }))
    }));
  },

  addTemplate(kind: 'grid' | 'photo' | 'blank') {
    const template =
      kind === 'grid' ? createGridTemplate() : kind === 'photo' ? createPhotoTemplate() : createBlankTemplate();
    patchProject((project) => ({ ...project, templates: [...project.templates, template] }));
    updateUi({ selectedTemplateId: template.id, selectedSlotId: '' });
  },

  duplicateTemplate() {
    const { project, ui } = get(store);
    const template = activeTemplate(project, ui);
    if (!template) return;
    const clone = duplicateTemplate(template);
    setProject({ ...project, templates: [...project.templates, clone] });
    updateUi({ selectedTemplateId: clone.id });
  },

  deleteTemplate(id: string) {
    const { project } = get(store);
    if (project.templates.length === 1) return;
    const templates = project.templates.filter((template) => template.id !== id);
    setProject({
      ...project,
      templates,
      pages: project.pages.map((page) => ({
        ...page,
        templateId: page.templateId === id ? undefined : page.templateId
      }))
    });
    updateUi({ selectedTemplateId: templates[0]?.id ?? '', selectedSlotId: '' });
  },

  updateTemplateName(name: string) {
    const { project, ui } = get(store);
    setProject({
      ...project,
      templates: project.templates.map((template) =>
        template.id === ui.selectedTemplateId ? { ...template, name } : template
      )
    });
  },

  addManualSlot() {
    const { project, ui } = get(store);
    const template = activeTemplate(project, ui);
    if (!template) return;
    const slot: SlotTemplate = {
      id: uid('slot'),
      label: `${template.slots.length + 1}`,
      x: 10,
      y: 10,
      w: 24,
      h: 24
    };
    setProject({
      ...project,
      templates: project.templates.map((candidate) =>
        candidate.id === template.id ? { ...candidate, slots: [...candidate.slots, slot] } : candidate
      )
    });
    updateUi({ selectedSlotId: slot.id });
  },

  addDrawnSlot(rect: { x: number; y: number; w: number; h: number }) {
    const { project, ui } = get(store);
    const template = activeTemplate(project, ui);
    if (!template || rect.w <= 2 || rect.h <= 2) return;
    const slot: SlotTemplate = {
      id: uid('slot'),
      label: `${template.slots.length + 1}`,
      x: round(rect.x),
      y: round(rect.y),
      w: round(rect.w),
      h: round(rect.h)
    };
    setProject({
      ...project,
      templates: project.templates.map((candidate) =>
        candidate.id === template.id ? { ...candidate, slots: [...candidate.slots, slot] } : candidate
      )
    });
    updateUi({ selectedSlotId: slot.id });
  },

  updateSlot(slotId: string, patch: Partial<SlotTemplate>) {
    const { project, ui } = get(store);
    setProject({
      ...project,
      templates: project.templates.map((template) =>
        template.id === ui.selectedTemplateId
          ? { ...template, slots: template.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)) }
          : template
      )
    });
  },

  removeSlot(slotId: string) {
    const { project, ui } = get(store);
    const template = activeTemplate(project, ui);
    if (!template) return;
    setProject({
      ...project,
      templates: project.templates.map((candidate) =>
        candidate.id === template.id
          ? { ...candidate, slots: candidate.slots.filter((slot) => slot.id !== slotId) }
          : candidate
      ),
      items: project.items.filter(
        (item) =>
          !(
            item.kind === 'slot' &&
            item.slotId === slotId &&
            project.pages.some((page) => page.templateId === template.id && page.id === item.pageId)
          )
      )
    });
    updateUi({ selectedSlotId: '' });
  },

  addBinderPage() {
    const { project } = get(store);
    const page: BinderPage = {
      id: uid('page'),
      title: `Binder page ${project.pages.length + 1}`,
      templateId: project.templates[0]?.id
    };
    setProject(ensureItemsForPage({ ...project, pages: [...project.pages, page] }, page));
    updateUi({ activeBookletPageId: page.id });
  },

  commitImportedAssets(candidates: StagedImportCandidate[], assignPage?: { pageId: string; side: 'front' | 'back' }) {
    if (!candidates.length) return;
    const assets: ScanAsset[] = candidates.flatMap((candidate) => {
      const baseName = candidate.name.trim() || candidate.name || `${candidate.source} p.${candidate.pageNumber}`;
      if (candidate.role === 'binder') {
        return [
          {
            id: uid('scan'),
            name: baseName,
            source: candidate.source,
            pageNumber: candidate.pageNumber,
            role: 'binder',
            side: candidate.side,
            image: candidate.image,
            width: candidate.width,
            height: candidate.height,
            createdAt: Date.now()
          }
        ];
      }

      const cropAssets: ScanAsset[] = [];
      if (candidate.frontCrop) {
        cropAssets.push({
          id: uid('scan'),
          name: `${baseName} front`,
          source: `${candidate.source} crop`,
          pageNumber: candidate.pageNumber,
          role: 'item',
          side: 'front',
          image: candidate.frontCrop.image,
          width: candidate.frontCrop.width,
          height: candidate.frontCrop.height,
          createdAt: Date.now()
        });
      }
      if (candidate.backCrop) {
        cropAssets.push({
          id: uid('scan'),
          name: `${baseName} back`,
          source: `${candidate.source} crop`,
          pageNumber: candidate.pageNumber,
          role: 'item',
          side: 'back',
          image: candidate.backCrop.image,
          width: candidate.backCrop.width,
          height: candidate.backCrop.height,
          createdAt: Date.now()
        });
      }
      if (cropAssets.length) return cropAssets;
      return [
        {
          id: uid('scan'),
          name: baseName,
          source: candidate.source,
          pageNumber: candidate.pageNumber,
          role: 'item',
          side: candidate.side === 'back' ? 'back' : 'front',
          image: candidate.image,
          width: candidate.width,
          height: candidate.height,
          createdAt: Date.now()
        }
      ];
    });

    const firstAssignablePageAsset = assets.find((asset) => asset.role === 'binder');
    patchProject((project) => ({
      ...project,
      assets: [...project.assets, ...assets],
      pages:
        assignPage && firstAssignablePageAsset
          ? project.pages.map((page) =>
              page.id === assignPage.pageId
                ? { ...page, [assignPage.side === 'front' ? 'frontScanId' : 'backScanId']: firstAssignablePageAsset.id }
                : page
            )
          : project.pages
    }));
    updateUi({
      importStatus: `Added ${assets.length} media asset${assets.length === 1 ? '' : 's'} to the library.`,
      templatePreviewAssetId: firstAssignablePageAsset?.id ?? get(store).ui.templatePreviewAssetId
    });
  },

  addLooseItem(insertIndex: number) {
    const { project } = get(store);
    const safeInsertIndex = clamp(insertIndex, 0, project.pages.length);
    const looseAtPosition = project.items.filter(
      (item) => item.kind === 'loose' && (item.insertIndex ?? project.pages.length) === safeInsertIndex
    );
    const item: BinderItem = {
      id: uid('item'),
      kind: 'loose',
      insertIndex: safeInsertIndex,
      looseOrder: looseAtPosition.length
        ? Math.max(...looseAtPosition.map((candidate) => candidate.looseOrder ?? 0)) + 1
        : 1,
      title: `Inserted item ${project.items.filter((candidate) => candidate.kind === 'loose').length + 1}`,
      date: '',
      people: '',
      notes: ''
    };
    setProject({ ...project, items: [...project.items, item] });
    updateUi({ activeBookletPageId: '', selectedItemId: item.id });
  },

  removeItem(id: string) {
    const { project, ui } = get(store);
    const item = project.items.find((candidate) => candidate.id === id);
    if (item?.kind !== 'loose') return;
    setProject({ ...project, items: project.items.filter((candidate) => candidate.id !== id) });
    updateUi({ selectedItemId: ui.selectedItemId === id ? '' : ui.selectedItemId });
  },

  removeBinderPage(id: string) {
    const { project } = get(store);
    const removedIndex = project.pages.findIndex((page) => page.id === id);
    const pages = project.pages.filter((page) => page.id !== id);
    setProject({
      ...project,
      pages,
      items: project.items
        .filter((item) => item.kind !== 'slot' || item.pageId !== id)
        .map((item) =>
          item.kind === 'loose' && removedIndex >= 0 && (item.insertIndex ?? pages.length) > removedIndex
            ? { ...item, insertIndex: Math.max(0, (item.insertIndex ?? pages.length) - 1) }
            : item
        )
    });
    updateUi({ activeBookletPageId: pages[0]?.id ?? '', selectedItemId: '' });
  },

  updatePage(id: string, patch: Partial<BinderPage>) {
    const { project } = get(store);
    const page = project.pages.find((candidate) => candidate.id === id);
    if (!page) return;
    setProject(setPageWithItems(project, { ...page, ...patch }));
  },

  moveBinderPage(id: string, direction: -1 | 1) {
    const { project } = get(store);
    const currentIndex = project.pages.findIndex((page) => page.id === id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= project.pages.length) return;
    const pages = [...project.pages];
    const [page] = pages.splice(currentIndex, 1);
    pages.splice(nextIndex, 0, page);
    setProject({ ...project, pages });
    updateUi({ activeBookletPageId: id });
  },

  applyPageDragOrder(pages: BinderPage[], persist = false) {
    const { project } = get(store);
    const nextProject = { ...project, pages };
    if (persist) setProject(nextProject);
    else store.update((current) => ({ ...current, project: nextProject }));
  },

  selectEditorSlot(page: BinderPage, slot: SlotTemplate) {
    const { project } = get(store);
    const nextProject = ensureItemsForPage(project, page);
    const item = itemForSlot(nextProject.items, page.id, slot.id);
    if (!item) return;
    setProject(nextProject);
    updateUi({ selectedItemId: item.id });
  },

  openPreviewSlot(page: BinderPage, slot: SlotTemplate, side: 'front' | 'back' = 'front') {
    const { project } = get(store);
    const nextProject = ensureItemsForPage(project, page);
    const item = itemForSlot(nextProject.items, page.id, slot.id);
    if (!item) return;
    setProject(nextProject);
    updateUi({
      selectedItemId: item.id,
      shadowItemId: item.id,
      shadowFlipped: side === 'back',
      shadowEditing: false
    });
  },

  openItemShadowbox(itemId: string, side: 'front' | 'back' = 'front') {
    updateUi({
      selectedItemId: itemId,
      shadowItemId: itemId,
      shadowFlipped: side === 'back',
      shadowEditing: false
    });
  },

  closeShadowbox() {
    updateUi({ shadowItemId: '', shadowEditing: false });
  },

  setShadowEditing(shadowEditing: boolean) {
    updateUi({ shadowEditing });
  },

  setShadowFlipped(shadowFlipped: boolean) {
    updateUi({ shadowFlipped });
  },

  movePreview(direction: -1 | 1) {
    const { project, ui } = get(store);
    const sides = buildPreviewSides(project.pages, project.items, project.assets);
    const spreads = buildPreviewSpreads(sides);
    const maxIndex = ui.previewMode === 'double' ? Math.max(0, spreads.length - 1) : Math.max(0, sides.length - 1);
    updateUi({ previewIndex: clamp(ui.previewIndex + direction, 0, maxIndex) });
  },

  setPreviewMode(previewMode: 'single' | 'double') {
    const { ui } = get(store);
    if (ui.previewMode === previewMode) return;
    updateUi({
      previewMode,
      previewIndex:
        previewMode === 'double' ? Math.ceil(ui.previewIndex / 2) : ui.previewIndex === 0 ? 0 : ui.previewIndex * 2 - 1
    });
  },

  updateItem(id: string, patch: Partial<BinderItem>) {
    updateItemById(id, patch);
  },

  async addGalleryPhotos(itemId: string, files: File[]) {
    if (!files.length) return;
    const photos = await readGalleryPhotos(files);
    if (!photos.length) return;
    const { project } = get(store);
    const item = project.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    updateItemById(itemId, { gallery: [...(item.gallery ?? []), ...photos] });
  },

  removeGalleryPhoto(itemId: string, photoId: string) {
    const { project } = get(store);
    const item = project.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    updateItemById(itemId, { gallery: (item.gallery ?? []).filter((photo) => photo.id !== photoId) });
  },

  async cropItemFromAsset(itemId: string, assetId: string, side: 'front' | 'back', rect: CropRect) {
    if (rect.w <= 2 || rect.h <= 2) return;
    const { project } = get(store);
    const item = project.items.find((candidate) => candidate.id === itemId);
    const source = project.assets.find((asset) => asset.id === assetId);
    if (!item || !source) return;

    const cropped = await cropScanAsset(source, rect, `${item.title || 'Item'} ${side} crop`);
    cropped.side = side;
    setProject({
      ...project,
      assets: [...project.assets, cropped],
      items: project.items.map((candidate) =>
        candidate.id === itemId
          ? { ...candidate, [side === 'front' ? 'frontScanId' : 'backScanId']: cropped.id }
          : candidate
      )
    });
  },

  syncLocationInput(item?: BinderItem, context: 'item' | 'shadow' = 'item') {
    if (!item) return;
    const search = locationInputValue(item);
    if (context === 'item') {
      const { ui } = get(store);
      if (ui.itemLocationSearchItemId !== item.id) {
        updateUi({ itemLocationSearch: search, itemLocationSearchItemId: item.id });
      }
    } else {
      const { ui } = get(store);
      if (ui.shadowLocationSearchItemId !== item.id) {
        updateUi({ shadowLocationSearch: search, shadowLocationSearchItemId: item.id });
      }
    }
  },

  handleLocationInput(itemId: string, value: string, context: 'item' | 'shadow') {
    updateUi(context === 'item' ? { itemLocationSearch: value } : { shadowLocationSearch: value });
    const location = findLocationByInput(value);
    const item = get(store).project.items.find((candidate) => candidate.id === itemId);
    if (!value.trim()) {
      updateItemById(itemId, { location: undefined, locationId: undefined });
    } else if (location) {
      updateItemById(itemId, { location, locationId: undefined });
    } else if (item?.location || item?.locationId) {
      updateItemById(itemId, { location: undefined, locationId: undefined });
    }
  },

  selectLocationSuggestion(itemId: string, location: LocationOption, context: 'item' | 'shadow') {
    const label = `${[location.name, location.region, location.country].filter(Boolean).join(', ')} (${location.kind})`;
    updateUi(
      context === 'item'
        ? { itemLocationSearch: label, itemLocationFocused: false }
        : { shadowLocationSearch: label, shadowLocationFocused: false }
    );
    updateItemById(itemId, { location, locationId: undefined });
  },

  setLocationFocused(context: 'item' | 'shadow', focused: boolean) {
    updateUi(context === 'item' ? { itemLocationFocused: focused } : { shadowLocationFocused: focused });
  },

  exportJson() {
    exportStateJson(get(store).project);
  },

  async importJson(file: File) {
    updateUi({ importBusy: true, importStatus: `Importing ${file.name}...` });
    try {
      const project = normalizeProject(await parseStateJson(file));
      setProject(project);
      updateUi({
        activeBookletPageId: project.pages[0]?.id ?? '',
        selectedTemplateId: project.templates[0]?.id ?? '',
        templatePreviewAssetId: project.assets.find((asset) => asset.role === 'binder')?.id ?? '',
        selectedItemId: '',
        shadowItemId: '',
        shadowEditing: false,
        importStatus: `Imported ${file.name}. This browser copy now has ${project.assets.length} scan${project.assets.length === 1 ? '' : 's'}, ${project.pages.length} page${project.pages.length === 1 ? '' : 's'}, and ${project.items.length} item${project.items.length === 1 ? '' : 's'}.`
      });
    } catch (error) {
      updateUi({
        importStatus: error instanceof Error ? error.message : 'That JSON file could not be imported.'
      });
    } finally {
      updateUi({ importBusy: false });
    }
  },

  async clearAll() {
    const project = defaultState();
    saveActiveTab('booklet');
    store.set({
      project,
      ui: {
        ...initialUi(project),
        ready: true,
        selectedTemplateId: project.templates[0]?.id ?? ''
      }
    });
    await saveStoredState(project);
  }
};

export function selectAssets(project: AppState) {
  return {
    binderAssets: project.assets.filter((asset: ScanAsset) => asset.role === 'binder'),
    itemAssets: project.assets.filter((asset: ScanAsset) => asset.role === 'item')
  };
}
