export type ScanRole = 'binder' | 'item';
export type ScanSide = 'front' | 'back' | 'unspecified';
export type Tab = 'booklet' | 'templates' | 'preview' | 'map' | 'data';
export type PreviewMode = 'single' | 'double';
export type LocationKind = 'city' | 'town' | 'park' | 'venue';
export type BinderItemKind = 'slot' | 'loose';

export type ScanAsset = {
  id: string;
  name: string;
  source: string;
  pageNumber: number;
  role: ScanRole;
  side: ScanSide;
  image: string;
  width: number;
  height: number;
  createdAt: number;
};

export type StagedCrop = {
  /** Object URL for live preview only; not persisted. */
  image: string;
  width: number;
  height: number;
  blob: Blob;
};

export type GalleryPhoto = {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
  createdAt: number;
};

export type StagedImportCandidate = {
  id: string;
  name: string;
  source: string;
  pageNumber: number;
  role: ScanRole;
  side: ScanSide;
  /** Object URL for live preview only; not persisted. */
  image: string;
  width: number;
  height: number;
  createdAt: number;
  frontCrop?: StagedCrop;
  backCrop?: StagedCrop;
  blob: Blob;
};

export type SlotTemplate = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PageTemplate = {
  id: string;
  name: string;
  slots: SlotTemplate[];
};

export type LocationOption = {
  id: string;
  name: string;
  region: string;
  country: string;
  kind: LocationKind;
  lat: number;
  lon: number;
};

export type BinderPage = {
  id: string;
  title: string;
  frontScanId?: string;
  backScanId?: string;
  templateId?: string;
};

export type BinderItem = {
  id: string;
  kind: BinderItemKind;
  pageId?: string;
  slotId?: string;
  insertIndex?: number;
  looseOrder?: number;
  title: string;
  date: string;
  people: string;
  location?: LocationOption;
  locationId?: string;
  notes: string;
  frontScanId?: string;
  backScanId?: string;
  gallery?: GalleryPhoto[];
};

export type AppState = {
  version: 1;
  assets: ScanAsset[];
  templates: PageTemplate[];
  pages: BinderPage[];
  items: BinderItem[];
  updatedAt: number;
};

export type DrawRect = {
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PreviewSide = {
  key: string;
  kind: 'page' | 'loose';
  page?: BinderPage;
  item?: BinderItem;
  side: 'front' | 'back';
  asset?: ScanAsset;
};

export type PreviewSpreadSlot = PreviewSide | null;

export type MapPinGroup = {
  location: LocationOption;
  items: BinderItem[];
  x: number;
  y: number;
};

export type CityLocationRecord = {
  name: string;
  region: string;
  countryCode: string;
  country: string;
  lat: number;
  lon: number;
};

export type BinderUiState = {
  activeTab: Tab;
  theme: string;
  ready: boolean;
  importStatus: string;
  importBusy: boolean;
  selectedTemplateId: string;
  templatePreviewAssetId: string;
  selectedSlotId: string;
  activeBookletPageId: string;
  selectedItemId: string;
  shadowItemId: string;
  itemLocationSearch: string;
  itemLocationSearchItemId: string;
  itemLocationFocused: boolean;
  shadowLocationSearch: string;
  shadowLocationSearchItemId: string;
  shadowLocationFocused: boolean;
  showBack: boolean;
  previewIndex: number;
  previewMode: PreviewMode;
  previewBorders: boolean;
  shadowFlipped: boolean;
  shadowEditing: boolean;
};

export type BinderStoreState = {
  project: AppState;
  ui: BinderUiState;
};
