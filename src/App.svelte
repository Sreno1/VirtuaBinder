<script lang="ts">
  import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Eye,
    FileArchive,
    FlipHorizontal,
    GripVertical,
    MapPinned,
    Pencil,
    Play,
    Plus,
    Trash2,
    Upload,
    X
  } from 'lucide-svelte';
  import { dragHandle, dragHandleZone } from 'svelte-dnd-action';
  import * as pdfjsLib from 'pdfjs-dist';
  import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
  import JSZip from 'jszip';
  import { onDestroy, onMount } from 'svelte';

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  type ScanRole = 'binder' | 'item';
  type ScanSide = 'front' | 'back' | 'unspecified';
  type Tab = 'import' | 'templates' | 'booklet' | 'preview' | 'map' | 'data';
  type PreviewMode = 'single' | 'double';
  type LocationKind = 'city' | 'town' | 'park' | 'venue';

  type ScanAsset = {
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

  type SlotTemplate = {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };

  type PageTemplate = {
    id: string;
    name: string;
    slots: SlotTemplate[];
  };

  type BinderPage = {
    id: string;
    title: string;
    frontScanId?: string;
    backScanId?: string;
    templateId?: string;
  };

  type BinderItem = {
    id: string;
    pageId: string;
    slotId: string;
    title: string;
    date: string;
    people: string;
    locationId?: string;
    notes: string;
    frontScanId?: string;
    backScanId?: string;
  };

  type LocationOption = {
    id: string;
    name: string;
    region: string;
    country: string;
    kind: LocationKind;
    lat: number;
    lon: number;
  };

  type AppState = {
    version: 1;
    assets: ScanAsset[];
    templates: PageTemplate[];
    pages: BinderPage[];
    items: BinderItem[];
    updatedAt: number;
  };

  type DrawRect = {
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  };

  type PreviewSide = {
    key: string;
    page: BinderPage;
    side: 'front' | 'back';
    asset?: ScanAsset;
  };

  type PreviewSpreadSlot = PreviewSide | null;

  type MapPinGroup = {
    location: LocationOption;
    items: BinderItem[];
    x: number;
    y: number;
  };

  const DB_NAME = 'timeline-binder-db';
  const STORE_NAME = 'documents';
  const STATE_KEY = 'active-state';
  const MAP_BOUNDS = { west: -171, east: -52, north: 73, south: 6 };
  const LOCATION_LIBRARY: LocationOption[] = [
    { id: 'anchorage-ak', name: 'Anchorage', region: 'Alaska', country: 'USA', kind: 'city', lat: 61.2176, lon: -149.8997 },
    { id: 'denali-national-park-ak', name: 'Denali National Park', region: 'Alaska', country: 'USA', kind: 'park', lat: 63.1148, lon: -151.1926 },
    { id: 'vancouver-bc', name: 'Vancouver', region: 'British Columbia', country: 'Canada', kind: 'city', lat: 49.2827, lon: -123.1207 },
    { id: 'victoria-bc', name: 'Victoria', region: 'British Columbia', country: 'Canada', kind: 'city', lat: 48.4284, lon: -123.3656 },
    { id: 'banff-national-park-ab', name: 'Banff National Park', region: 'Alberta', country: 'Canada', kind: 'park', lat: 51.4968, lon: -115.9281 },
    { id: 'calgary-ab', name: 'Calgary', region: 'Alberta', country: 'Canada', kind: 'city', lat: 51.0447, lon: -114.0719 },
    { id: 'seattle-wa', name: 'Seattle', region: 'Washington', country: 'USA', kind: 'city', lat: 47.6062, lon: -122.3321 },
    { id: 'portland-or', name: 'Portland', region: 'Oregon', country: 'USA', kind: 'city', lat: 45.5152, lon: -122.6784 },
    { id: 'san-francisco-ca', name: 'San Francisco', region: 'California', country: 'USA', kind: 'city', lat: 37.7749, lon: -122.4194 },
    { id: 'yosemite-national-park-ca', name: 'Yosemite National Park', region: 'California', country: 'USA', kind: 'park', lat: 37.8651, lon: -119.5383 },
    { id: 'los-angeles-ca', name: 'Los Angeles', region: 'California', country: 'USA', kind: 'city', lat: 34.0522, lon: -118.2437 },
    { id: 'disneyland-anaheim-ca', name: 'Disneyland Resort', region: 'California', country: 'USA', kind: 'venue', lat: 33.8121, lon: -117.919 },
    { id: 'san-diego-ca', name: 'San Diego', region: 'California', country: 'USA', kind: 'city', lat: 32.7157, lon: -117.1611 },
    { id: 'las-vegas-nv', name: 'Las Vegas', region: 'Nevada', country: 'USA', kind: 'city', lat: 36.1716, lon: -115.1391 },
    { id: 'grand-canyon-national-park-az', name: 'Grand Canyon National Park', region: 'Arizona', country: 'USA', kind: 'park', lat: 36.1069, lon: -112.1129 },
    { id: 'phoenix-az', name: 'Phoenix', region: 'Arizona', country: 'USA', kind: 'city', lat: 33.4484, lon: -112.074 },
    { id: 'salt-lake-city-ut', name: 'Salt Lake City', region: 'Utah', country: 'USA', kind: 'city', lat: 40.7608, lon: -111.891 },
    { id: 'yellowstone-national-park-wy', name: 'Yellowstone National Park', region: 'Wyoming', country: 'USA', kind: 'park', lat: 44.428, lon: -110.5885 },
    { id: 'denver-co', name: 'Denver', region: 'Colorado', country: 'USA', kind: 'city', lat: 39.7392, lon: -104.9903 },
    { id: 'rocky-mountain-national-park-co', name: 'Rocky Mountain National Park', region: 'Colorado', country: 'USA', kind: 'park', lat: 40.3428, lon: -105.6836 },
    { id: 'santa-fe-nm', name: 'Santa Fe', region: 'New Mexico', country: 'USA', kind: 'city', lat: 35.687, lon: -105.9378 },
    { id: 'albuquerque-nm', name: 'Albuquerque', region: 'New Mexico', country: 'USA', kind: 'city', lat: 35.0844, lon: -106.6504 },
    { id: 'dallas-tx', name: 'Dallas', region: 'Texas', country: 'USA', kind: 'city', lat: 32.7767, lon: -96.797 },
    { id: 'austin-tx', name: 'Austin', region: 'Texas', country: 'USA', kind: 'city', lat: 30.2672, lon: -97.7431 },
    { id: 'san-antonio-tx', name: 'San Antonio', region: 'Texas', country: 'USA', kind: 'city', lat: 29.4241, lon: -98.4936 },
    { id: 'houston-tx', name: 'Houston', region: 'Texas', country: 'USA', kind: 'city', lat: 29.7604, lon: -95.3698 },
    { id: 'new-orleans-la', name: 'New Orleans', region: 'Louisiana', country: 'USA', kind: 'city', lat: 29.9511, lon: -90.0715 },
    { id: 'memphis-tn', name: 'Memphis', region: 'Tennessee', country: 'USA', kind: 'city', lat: 35.1495, lon: -90.049 },
    { id: 'nashville-tn', name: 'Nashville', region: 'Tennessee', country: 'USA', kind: 'city', lat: 36.1627, lon: -86.7816 },
    { id: 'grand-ole-opry-tn', name: 'Grand Ole Opry', region: 'Tennessee', country: 'USA', kind: 'venue', lat: 36.2069, lon: -86.692 },
    { id: 'dollywood-tn', name: 'Dollywood', region: 'Tennessee', country: 'USA', kind: 'venue', lat: 35.7946, lon: -83.5302 },
    { id: 'great-smoky-mountains-national-park-tn', name: 'Great Smoky Mountains National Park', region: 'Tennessee', country: 'USA', kind: 'park', lat: 35.6532, lon: -83.507 },
    { id: 'chicago-il', name: 'Chicago', region: 'Illinois', country: 'USA', kind: 'city', lat: 41.8781, lon: -87.6298 },
    { id: 'wrigley-field-il', name: 'Wrigley Field', region: 'Illinois', country: 'USA', kind: 'venue', lat: 41.9484, lon: -87.6553 },
    { id: 'st-louis-mo', name: 'St. Louis', region: 'Missouri', country: 'USA', kind: 'city', lat: 38.627, lon: -90.1994 },
    { id: 'kansas-city-mo', name: 'Kansas City', region: 'Missouri', country: 'USA', kind: 'city', lat: 39.0997, lon: -94.5786 },
    { id: 'minneapolis-mn', name: 'Minneapolis', region: 'Minnesota', country: 'USA', kind: 'city', lat: 44.9778, lon: -93.265 },
    { id: 'mall-of-america-mn', name: 'Mall of America', region: 'Minnesota', country: 'USA', kind: 'venue', lat: 44.8549, lon: -93.2422 },
    { id: 'milwaukee-wi', name: 'Milwaukee', region: 'Wisconsin', country: 'USA', kind: 'city', lat: 43.0389, lon: -87.9065 },
    { id: 'detroit-mi', name: 'Detroit', region: 'Michigan', country: 'USA', kind: 'city', lat: 42.3314, lon: -83.0458 },
    { id: 'cleveland-oh', name: 'Cleveland', region: 'Ohio', country: 'USA', kind: 'city', lat: 41.4993, lon: -81.6944 },
    { id: 'cincinnati-oh', name: 'Cincinnati', region: 'Ohio', country: 'USA', kind: 'city', lat: 39.1031, lon: -84.512 },
    { id: 'atlanta-ga', name: 'Atlanta', region: 'Georgia', country: 'USA', kind: 'city', lat: 33.749, lon: -84.388 },
    { id: 'savannah-ga', name: 'Savannah', region: 'Georgia', country: 'USA', kind: 'city', lat: 32.0809, lon: -81.0912 },
    { id: 'charleston-sc', name: 'Charleston', region: 'South Carolina', country: 'USA', kind: 'city', lat: 32.7765, lon: -79.9311 },
    { id: 'asheville-nc', name: 'Asheville', region: 'North Carolina', country: 'USA', kind: 'city', lat: 35.5951, lon: -82.5515 },
    { id: 'outer-banks-nc', name: 'Outer Banks', region: 'North Carolina', country: 'USA', kind: 'town', lat: 35.5585, lon: -75.4665 },
    { id: 'washington-dc', name: 'Washington', region: 'District of Columbia', country: 'USA', kind: 'city', lat: 38.9072, lon: -77.0369 },
    { id: 'baltimore-md', name: 'Baltimore', region: 'Maryland', country: 'USA', kind: 'city', lat: 39.2904, lon: -76.6122 },
    { id: 'philadelphia-pa', name: 'Philadelphia', region: 'Pennsylvania', country: 'USA', kind: 'city', lat: 39.9526, lon: -75.1652 },
    { id: 'new-york-ny', name: 'New York City', region: 'New York', country: 'USA', kind: 'city', lat: 40.7128, lon: -74.006 },
    { id: 'times-square-ny', name: 'Times Square', region: 'New York', country: 'USA', kind: 'venue', lat: 40.758, lon: -73.9855 },
    { id: 'boston-ma', name: 'Boston', region: 'Massachusetts', country: 'USA', kind: 'city', lat: 42.3601, lon: -71.0589 },
    { id: 'fenway-park-ma', name: 'Fenway Park', region: 'Massachusetts', country: 'USA', kind: 'venue', lat: 42.3467, lon: -71.0972 },
    { id: 'portland-me', name: 'Portland', region: 'Maine', country: 'USA', kind: 'city', lat: 43.6591, lon: -70.2568 },
    { id: 'acadia-national-park-me', name: 'Acadia National Park', region: 'Maine', country: 'USA', kind: 'park', lat: 44.3386, lon: -68.2733 },
    { id: 'toronto-on', name: 'Toronto', region: 'Ontario', country: 'Canada', kind: 'city', lat: 43.6532, lon: -79.3832 },
    { id: 'niagara-falls-on', name: 'Niagara Falls', region: 'Ontario', country: 'Canada', kind: 'city', lat: 43.0896, lon: -79.0849 },
    { id: 'ottawa-on', name: 'Ottawa', region: 'Ontario', country: 'Canada', kind: 'city', lat: 45.4215, lon: -75.6972 },
    { id: 'montreal-qc', name: 'Montreal', region: 'Quebec', country: 'Canada', kind: 'city', lat: 45.5017, lon: -73.5673 },
    { id: 'quebec-city-qc', name: 'Quebec City', region: 'Quebec', country: 'Canada', kind: 'city', lat: 46.8139, lon: -71.208 },
    { id: 'halifax-ns', name: 'Halifax', region: 'Nova Scotia', country: 'Canada', kind: 'city', lat: 44.6488, lon: -63.5752 },
    { id: 'winnipeg-mb', name: 'Winnipeg', region: 'Manitoba', country: 'Canada', kind: 'city', lat: 49.8951, lon: -97.1384 },
    { id: 'saskatoon-sk', name: 'Saskatoon', region: 'Saskatchewan', country: 'Canada', kind: 'city', lat: 52.1579, lon: -106.6702 },
    { id: 'edmonton-ab', name: 'Edmonton', region: 'Alberta', country: 'Canada', kind: 'city', lat: 53.5461, lon: -113.4938 },
    { id: 'orlando-fl', name: 'Orlando', region: 'Florida', country: 'USA', kind: 'city', lat: 28.5383, lon: -81.3792 },
    { id: 'walt-disney-world-fl', name: 'Walt Disney World', region: 'Florida', country: 'USA', kind: 'venue', lat: 28.3772, lon: -81.5707 },
    { id: 'universal-orlando-fl', name: 'Universal Orlando Resort', region: 'Florida', country: 'USA', kind: 'venue', lat: 28.4744, lon: -81.4685 },
    { id: 'miami-fl', name: 'Miami', region: 'Florida', country: 'USA', kind: 'city', lat: 25.7617, lon: -80.1918 },
    { id: 'key-west-fl', name: 'Key West', region: 'Florida', country: 'USA', kind: 'town', lat: 24.5551, lon: -81.78 },
    { id: 'everglades-national-park-fl', name: 'Everglades National Park', region: 'Florida', country: 'USA', kind: 'park', lat: 25.2866, lon: -80.8987 },
    { id: 'honolulu-hi', name: 'Honolulu', region: 'Hawaii', country: 'USA', kind: 'city', lat: 21.3099, lon: -157.8581 },
    { id: 'mexico-city-cdmx', name: 'Mexico City', region: 'CDMX', country: 'Mexico', kind: 'city', lat: 19.4326, lon: -99.1332 },
    { id: 'guadalajara-jalisco', name: 'Guadalajara', region: 'Jalisco', country: 'Mexico', kind: 'city', lat: 20.6597, lon: -103.3496 },
    { id: 'monterrey-nuevo-leon', name: 'Monterrey', region: 'Nuevo Leon', country: 'Mexico', kind: 'city', lat: 25.6866, lon: -100.3161 },
    { id: 'cancun-quintana-roo', name: 'Cancun', region: 'Quintana Roo', country: 'Mexico', kind: 'city', lat: 21.1619, lon: -86.8515 },
    { id: 'tulum-quintana-roo', name: 'Tulum', region: 'Quintana Roo', country: 'Mexico', kind: 'town', lat: 20.2114, lon: -87.4654 },
    { id: 'chichen-itza-yucatan', name: 'Chichen Itza', region: 'Yucatan', country: 'Mexico', kind: 'venue', lat: 20.6843, lon: -88.5678 },
    { id: 'oaxaca-oaxaca', name: 'Oaxaca', region: 'Oaxaca', country: 'Mexico', kind: 'city', lat: 17.0732, lon: -96.7266 },
    { id: 'puerto-vallarta-jalisco', name: 'Puerto Vallarta', region: 'Jalisco', country: 'Mexico', kind: 'city', lat: 20.6534, lon: -105.2253 },
    { id: 'belize-city-belize', name: 'Belize City', region: 'Belize District', country: 'Belize', kind: 'city', lat: 17.5046, lon: -88.1962 },
    { id: 'san-pedro-belize', name: 'San Pedro', region: 'Ambergris Caye', country: 'Belize', kind: 'town', lat: 17.9214, lon: -87.9611 },
    { id: 'tikal-national-park-guatemala', name: 'Tikal National Park', region: 'Peten', country: 'Guatemala', kind: 'park', lat: 17.222, lon: -89.6237 },
    { id: 'antigua-guatemala', name: 'Antigua Guatemala', region: 'Sacatepequez', country: 'Guatemala', kind: 'city', lat: 14.5586, lon: -90.7295 },
    { id: 'san-salvador-el-salvador', name: 'San Salvador', region: 'San Salvador', country: 'El Salvador', kind: 'city', lat: 13.6929, lon: -89.2182 },
    { id: 'tegucigalpa-honduras', name: 'Tegucigalpa', region: 'Francisco Morazan', country: 'Honduras', kind: 'city', lat: 14.0723, lon: -87.1921 },
    { id: 'roatan-honduras', name: 'Roatan', region: 'Bay Islands', country: 'Honduras', kind: 'town', lat: 16.3298, lon: -86.5299 },
    { id: 'managua-nicaragua', name: 'Managua', region: 'Managua', country: 'Nicaragua', kind: 'city', lat: 12.114, lon: -86.2362 },
    { id: 'granada-nicaragua', name: 'Granada', region: 'Granada', country: 'Nicaragua', kind: 'city', lat: 11.9344, lon: -85.956 },
    { id: 'san-jose-costa-rica', name: 'San Jose', region: 'San Jose', country: 'Costa Rica', kind: 'city', lat: 9.9281, lon: -84.0907 },
    { id: 'manuel-antonio-national-park-cr', name: 'Manuel Antonio National Park', region: 'Puntarenas', country: 'Costa Rica', kind: 'park', lat: 9.3894, lon: -84.1347 },
    { id: 'panama-city-panama', name: 'Panama City', region: 'Panama', country: 'Panama', kind: 'city', lat: 8.9824, lon: -79.5199 },
    { id: 'panama-canal-panama', name: 'Panama Canal', region: 'Panama', country: 'Panama', kind: 'venue', lat: 9.1012, lon: -79.6901 },
    { id: 'havana-cuba', name: 'Havana', region: 'La Habana', country: 'Cuba', kind: 'city', lat: 23.1136, lon: -82.3666 },
    { id: 'varadero-cuba', name: 'Varadero', region: 'Matanzas', country: 'Cuba', kind: 'town', lat: 23.1568, lon: -81.2448 },
    { id: 'nassau-bahamas', name: 'Nassau', region: 'New Providence', country: 'Bahamas', kind: 'city', lat: 25.0443, lon: -77.3504 },
    { id: 'freeport-bahamas', name: 'Freeport', region: 'Grand Bahama', country: 'Bahamas', kind: 'city', lat: 26.5333, lon: -78.7 },
    { id: 'kingston-jamaica', name: 'Kingston', region: 'Kingston', country: 'Jamaica', kind: 'city', lat: 18.0179, lon: -76.8099 },
    { id: 'montego-bay-jamaica', name: 'Montego Bay', region: 'St. James', country: 'Jamaica', kind: 'city', lat: 18.4762, lon: -77.8939 },
    { id: 'george-town-cayman', name: 'George Town', region: 'Grand Cayman', country: 'Cayman Islands', kind: 'city', lat: 19.2866, lon: -81.3744 },
    { id: 'san-juan-pr', name: 'San Juan', region: 'Puerto Rico', country: 'USA', kind: 'city', lat: 18.4655, lon: -66.1057 },
    { id: 'el-yunque-pr', name: 'El Yunque National Forest', region: 'Puerto Rico', country: 'USA', kind: 'park', lat: 18.31, lon: -65.78 },
    { id: 'santo-domingo-dr', name: 'Santo Domingo', region: 'Distrito Nacional', country: 'Dominican Republic', kind: 'city', lat: 18.4861, lon: -69.9312 },
    { id: 'punta-cana-dr', name: 'Punta Cana', region: 'La Altagracia', country: 'Dominican Republic', kind: 'town', lat: 18.5601, lon: -68.3725 },
    { id: 'port-au-prince-haiti', name: 'Port-au-Prince', region: 'Ouest', country: 'Haiti', kind: 'city', lat: 18.5944, lon: -72.3074 },
    { id: 'st-thomas-usvi', name: 'St. Thomas', region: 'U.S. Virgin Islands', country: 'USA', kind: 'town', lat: 18.3381, lon: -64.8941 },
    { id: 'charlotte-amalie-usvi', name: 'Charlotte Amalie', region: 'U.S. Virgin Islands', country: 'USA', kind: 'town', lat: 18.3419, lon: -64.9307 },
    { id: 'st-johns-antigua', name: "St. John's", region: 'Antigua', country: 'Antigua and Barbuda', kind: 'city', lat: 17.1274, lon: -61.8468 },
    { id: 'bridgetown-barbados', name: 'Bridgetown', region: 'Saint Michael', country: 'Barbados', kind: 'city', lat: 13.0975, lon: -59.6167 },
    { id: 'castries-st-lucia', name: 'Castries', region: 'Castries', country: 'Saint Lucia', kind: 'city', lat: 14.0101, lon: -60.9875 },
    { id: 'oranjestad-aruba', name: 'Oranjestad', region: 'Aruba', country: 'Netherlands', kind: 'city', lat: 12.5092, lon: -70.0086 },
    { id: 'willemstad-curacao', name: 'Willemstad', region: 'Curacao', country: 'Netherlands', kind: 'city', lat: 12.1224, lon: -68.8824 }
  ];

  let state: AppState = defaultState();
  let activeTab: Tab = 'import';
  let ready = false;
  let importStatus = '';
  let importBusy = false;
  let selectedTemplateId = state.templates[0]?.id;
  let templatePreviewAssetId = '';
  let selectedSlotId = '';
  let activeBookletPageId = '';
  let selectedItemId = '';
  let shadowItemId = '';
  let showBack = false;
  let previewIndex = 0;
  let previewMode: PreviewMode = 'double';
  let previewBorders = true;
  let previewMaxIndex = 0;
  let shadowFlipped = false;
  let shadowEditing = false;
  let drawing: DrawRect | null = null;
  let templateCanvas: HTMLDivElement;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  $: binderAssets = state.assets.filter((asset) => asset.role === 'binder');
  $: itemAssets = state.assets.filter((asset) => asset.role === 'item');
  $: selectedTemplate = state.templates.find((template) => template.id === selectedTemplateId);
  $: templatePreviewAsset =
    state.assets.find((asset) => asset.id === templatePreviewAssetId) ?? binderAssets[0];
  $: activePage = state.pages.find((page) => page.id === activeBookletPageId) ?? state.pages[0];
  $: activeTemplate = activePage?.templateId
    ? state.templates.find((template) => template.id === activePage.templateId)
    : undefined;
  $: activePageImage = activePage
    ? state.assets.find((asset) => asset.id === (showBack ? activePage.backScanId : activePage.frontScanId))
    : undefined;
  $: selectedItem = state.items.find((item) => item.id === selectedItemId);
  $: shadowItem = state.items.find((item) => item.id === shadowItemId);
  $: mapPins = buildMapPins(state.items);
  $: previewSides = buildPreviewSides(state.pages, state.assets);
  $: previewSpreads = buildPreviewSpreads(previewSides);
  $: previewVisibleSides =
    previewMode === 'double'
      ? previewSpreads[previewIndex] ?? []
      : [previewSides[previewIndex]].filter(Boolean);
  $: previewMaxIndex =
    previewMode === 'double'
      ? Math.max(0, previewSpreads.length - 1)
      : Math.max(0, previewSides.length - 1);
  $: if (previewIndex > previewMaxIndex) {
    previewIndex = previewMaxIndex;
  }

  onMount(async () => {
    const stored = await loadStoredState();
    if (stored) {
      state = stored;
      selectedTemplateId = state.templates[0]?.id ?? '';
      activeBookletPageId = state.pages[0]?.id ?? '';
      templatePreviewAssetId = binderAssets[0]?.id ?? '';
    }
    ready = true;
  });

  onDestroy(() => {
    if (saveTimer) window.clearTimeout(saveTimer);
    window.removeEventListener('mousemove', moveDraw);
    window.removeEventListener('mouseup', endDraw);
  });

  function uid(prefix: string) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  function defaultState(): AppState {
    const grid = createGridTemplate();
    return {
      version: 1,
      assets: [],
      templates: [grid],
      pages: [],
      items: [],
      updatedAt: Date.now()
    };
  }

  function createGridTemplate(): PageTemplate {
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

    return {
      id: uid('template'),
      name: 'Trading card page 3x3',
      slots
    };
  }

  function createPhotoTemplate(): PageTemplate {
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

  function commit(next: AppState = state) {
    state = { ...next, updatedAt: Date.now() };
    scheduleSave();
  }

  function scheduleSave() {
    if (!ready) return;
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void saveStoredState(state);
    }, 350);
  }

  function assetById(id?: string) {
    return state.assets.find((asset) => asset.id === id);
  }

  function templateById(id?: string) {
    return state.templates.find((template) => template.id === id);
  }

  function itemForSlot(pageId: string, slotId: string) {
    return state.items.find((item) => item.pageId === pageId && item.slotId === slotId);
  }

  function slotPositionStyle(slot: SlotTemplate, mirrored = false) {
    const x = mirrored ? 100 - slot.x - slot.w : slot.x;
    return `left:${round(x)}%;top:${slot.y}%;width:${slot.w}%;height:${slot.h}%;`;
  }

  async function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadStoredState(): Promise<AppState | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve((request.result as AppState | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveStoredState(value: AppState) {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function handleImport(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    importBusy = true;
    importStatus = `Reading ${files.length} file${files.length === 1 ? '' : 's'}...`;

    try {
      const imported: ScanAsset[] = [];

      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zipAssets = await renderZip(file);
          imported.push(...zipAssets);
        } else if (file.name.toLowerCase().endsWith('.pdf')) {
          const buffer = await file.arrayBuffer();
          const pdfAssets = await renderPdf(buffer, file.name, file.name);
          imported.push(...pdfAssets);
        }
      }

      if (imported.length) {
        state.assets = [...state.assets, ...imported];
        if (!templatePreviewAssetId) templatePreviewAssetId = imported[0].id;
        importStatus = `Imported ${imported.length} rendered page${imported.length === 1 ? '' : 's'}.`;
        commit();
      } else {
        importStatus = 'No PDF files were found in that selection.';
      }
    } catch (error) {
      importStatus = error instanceof Error ? error.message : 'Import failed.';
    } finally {
      importBusy = false;
    }
  }

  async function renderZip(file: File) {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter(
      (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.pdf')
    );
    const imported: ScanAsset[] = [];

    for (const entry of entries) {
      importStatus = `Rendering ${entry.name} from ${file.name}...`;
      const buffer = await entry.async('arraybuffer');
      imported.push(...(await renderPdf(buffer, entry.name.split('/').pop() ?? entry.name, file.name)));
    }

    return imported;
  }

  async function renderPdf(buffer: ArrayBuffer, name: string, source: string) {
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const imported: ScanAsset[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      importStatus = `Rendering ${name}, page ${pageNumber} of ${pdf.numPages}...`;
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
        id: uid('scan'),
        name: pdf.numPages > 1 ? `${name} p.${pageNumber}` : name,
        source,
        pageNumber,
        role: 'binder',
        side: 'unspecified',
        image: canvas.toDataURL('image/jpeg', 0.9),
        width: canvas.width,
        height: canvas.height,
        createdAt: Date.now()
      });
    }

    return imported;
  }

  function setAssetRole(asset: ScanAsset, role: ScanRole) {
    asset.role = role;
    commit();
  }

  function setAssetSide(asset: ScanAsset, side: ScanSide) {
    asset.side = side;
    commit();
  }

  function removeAsset(id: string) {
    state.assets = state.assets.filter((asset) => asset.id !== id);
    state.pages = state.pages.map((page) => ({
      ...page,
      frontScanId: page.frontScanId === id ? undefined : page.frontScanId,
      backScanId: page.backScanId === id ? undefined : page.backScanId
    }));
    state.items = state.items.map((item) => ({
      ...item,
      frontScanId: item.frontScanId === id ? undefined : item.frontScanId,
      backScanId: item.backScanId === id ? undefined : item.backScanId
    }));
    commit();
  }

  function addTemplate(kind: 'grid' | 'photo' | 'blank') {
    const template =
      kind === 'grid'
        ? createGridTemplate()
        : kind === 'photo'
          ? createPhotoTemplate()
          : { id: uid('template'), name: 'New stencil', slots: [] };
    state.templates = [...state.templates, template];
    selectedTemplateId = template.id;
    selectedSlotId = '';
    commit();
  }

  function duplicateTemplate() {
    if (!selectedTemplate) return;
    const clone: PageTemplate = {
      id: uid('template'),
      name: `${selectedTemplate.name} copy`,
      slots: selectedTemplate.slots.map((slot) => ({ ...slot, id: uid('slot') }))
    };
    state.templates = [...state.templates, clone];
    selectedTemplateId = clone.id;
    commit();
  }

  function deleteTemplate(id: string) {
    if (state.templates.length === 1) return;
    state.templates = state.templates.filter((template) => template.id !== id);
    state.pages = state.pages.map((page) => ({
      ...page,
      templateId: page.templateId === id ? undefined : page.templateId
    }));
    selectedTemplateId = state.templates[0]?.id ?? '';
    selectedSlotId = '';
    commit();
  }

  function updateTemplateName(name: string) {
    if (!selectedTemplate) return;
    selectedTemplate.name = name;
    commit();
  }

  function addManualSlot() {
    if (!selectedTemplate) return;
    const slot: SlotTemplate = {
      id: uid('slot'),
      label: `${selectedTemplate.slots.length + 1}`,
      x: 10,
      y: 10,
      w: 24,
      h: 24
    };
    selectedTemplate.slots = [...selectedTemplate.slots, slot];
    selectedSlotId = slot.id;
    commit();
  }

  function updateSlot(slotId: string, patch: Partial<SlotTemplate>) {
    if (!selectedTemplate) return;
    selectedTemplate.slots = selectedTemplate.slots.map((slot) =>
      slot.id === slotId ? { ...slot, ...patch } : slot
    );
    commit();
  }

  function removeSlot(slotId: string) {
    if (!selectedTemplate) return;
    selectedTemplate.slots = selectedTemplate.slots.filter((slot) => slot.id !== slotId);
    state.items = state.items.filter(
      (item) => !(item.slotId === slotId && state.pages.some((page) => page.templateId === selectedTemplate.id && page.id === item.pageId))
    );
    selectedSlotId = '';
    commit();
  }

  function percentFromEvent(event: MouseEvent) {
    const rect = templateCanvas.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    return { x, y };
  }

  function startDraw(event: MouseEvent) {
    if (!selectedTemplate || !templatePreviewAsset) return;
    if ((event.target as HTMLElement).dataset.slotId) return;
    const point = percentFromEvent(event);
    drawing = { startX: point.x, startY: point.y, x: point.x, y: point.y, w: 0, h: 0 };
    window.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);
  }

  function moveDraw(event: MouseEvent) {
    if (!drawing) return;
    const point = percentFromEvent(event);
    drawing = {
      ...drawing,
      x: Math.min(drawing.startX, point.x),
      y: Math.min(drawing.startY, point.y),
      w: Math.abs(point.x - drawing.startX),
      h: Math.abs(point.y - drawing.startY)
    };
  }

  function endDraw() {
    if (drawing && selectedTemplate && drawing.w > 2 && drawing.h > 2) {
      const slot: SlotTemplate = {
        id: uid('slot'),
        label: `${selectedTemplate.slots.length + 1}`,
        x: round(drawing.x),
        y: round(drawing.y),
        w: round(drawing.w),
        h: round(drawing.h)
      };
      selectedTemplate.slots = [...selectedTemplate.slots, slot];
      selectedSlotId = slot.id;
      commit();
    }
    drawing = null;
    window.removeEventListener('mousemove', moveDraw);
    window.removeEventListener('mouseup', endDraw);
  }

  function addBinderPage() {
    const page: BinderPage = {
      id: uid('page'),
      title: `Binder page ${state.pages.length + 1}`,
      templateId: state.templates[0]?.id,
      frontScanId: binderAssets[0]?.id,
      backScanId: binderAssets[1]?.id
    };
    state.pages = [...state.pages, page];
    activeBookletPageId = page.id;
    ensureItemsForPage(page);
    commit();
  }

  function removeBinderPage(id: string) {
    state.pages = state.pages.filter((page) => page.id !== id);
    state.items = state.items.filter((item) => item.pageId !== id);
    activeBookletPageId = state.pages[0]?.id ?? '';
    selectedItemId = '';
    commit();
  }

  function updatePage(id: string, patch: Partial<BinderPage>) {
    state.pages = state.pages.map((page) => (page.id === id ? { ...page, ...patch } : page));
    const page = state.pages.find((candidate) => candidate.id === id);
    if (page) ensureItemsForPage(page);
    commit();
  }

  function moveBinderPage(id: string, direction: -1 | 1) {
    const currentIndex = state.pages.findIndex((page) => page.id === id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= state.pages.length) return;

    const pages = [...state.pages];
    const [page] = pages.splice(currentIndex, 1);
    pages.splice(nextIndex, 0, page);
    state.pages = pages;
    activeBookletPageId = id;
    commit();
  }

  function applyPageDragOrder(event: CustomEvent<{ items: BinderPage[] }>, persist = false) {
    state = { ...state, pages: event.detail.items };
    if (persist) commit();
  }

  function ensureItemsForPage(page: BinderPage) {
    const template = templateById(page.templateId);
    if (!template) return;
    const additions = template.slots
      .filter((slot) => !itemForSlot(page.id, slot.id))
      .map((slot) => ({
        id: uid('item'),
        pageId: page.id,
        slotId: slot.id,
        title: `${page.title} slot ${slot.label}`,
        date: '',
        people: '',
        notes: ''
      }));
    state.items = [...state.items, ...additions];
  }

  function selectEditorSlot(page: BinderPage, slot: SlotTemplate) {
    ensureItemsForPage(page);
    const item = itemForSlot(page.id, slot.id);
    if (!item) return;
    selectedItemId = item.id;
    commit();
  }

  function openPreviewSlot(page: BinderPage, slot: SlotTemplate, side: 'front' | 'back' = 'front') {
    ensureItemsForPage(page);
    const item = itemForSlot(page.id, slot.id);
    if (!item) return;
    selectedItemId = item.id;
    shadowItemId = item.id;
    shadowFlipped = side === 'back';
    shadowEditing = false;
    commit();
  }

  function closeShadowbox() {
    shadowItemId = '';
    shadowEditing = false;
  }

  function buildPreviewSides(pages: BinderPage[], assets: ScanAsset[]): PreviewSide[] {
    return pages.flatMap((page) => [
      {
        key: `${page.id}-front`,
        page,
        side: 'front' as const,
        asset: assets.find((asset) => asset.id === page.frontScanId)
      },
      {
        key: `${page.id}-back`,
        page,
        side: 'back' as const,
        asset: assets.find((asset) => asset.id === page.backScanId)
      }
    ]);
  }

  function buildPreviewSpreads(sides: PreviewSide[]): PreviewSpreadSlot[][] {
    if (!sides.length) return [];

    const spreads: PreviewSpreadSlot[][] = [[null, sides[0]]];
    for (let index = 1; index < sides.length; index += 2) {
      spreads.push([sides[index], sides[index + 1] ?? null]);
    }
    return spreads;
  }

  function movePreview(direction: -1 | 1) {
    previewIndex = clamp(previewIndex + direction, 0, previewMaxIndex);
  }

  function setPreviewMode(mode: PreviewMode) {
    if (previewMode === mode) return;
    previewIndex =
      mode === 'double'
        ? Math.ceil(previewIndex / 2)
        : previewIndex === 0
          ? 0
          : previewIndex * 2 - 1;
    previewMode = mode;
  }

  function buildMapPins(items: BinderItem[]): MapPinGroup[] {
    const grouped = new Map<string, BinderItem[]>();

    for (const item of items) {
      if (!item.locationId) continue;
      grouped.set(item.locationId, [...(grouped.get(item.locationId) ?? []), item]);
    }

    return Array.from(grouped.entries())
      .map(([locationId, locationItems]) => {
        const location = locationById(locationId);
        if (!location) return null;
        const point = projectLocation(location);
        return { location, items: locationItems, x: point.x, y: point.y };
      })
      .filter((pin): pin is MapPinGroup => Boolean(pin))
      .sort((a, b) => a.location.name.localeCompare(b.location.name));
  }

  function locationById(id?: string) {
    return LOCATION_LIBRARY.find((location) => location.id === id);
  }

  function projectLocation(location: LocationOption) {
    const x = ((location.lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
    const y = ((MAP_BOUNDS.north - location.lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
    return {
      x: clamp(x, 2, 98),
      y: clamp(y, 4, 96)
    };
  }

  function mapPinStyle(pin: MapPinGroup) {
    return `left:${round(pin.x)}%;top:${round(pin.y)}%;`;
  }

  function openItemShadowbox(itemId: string) {
    selectedItemId = itemId;
    shadowItemId = itemId;
    shadowFlipped = false;
    shadowEditing = false;
  }

  function updateItem(id: string, patch: Partial<BinderItem>) {
    state.items = state.items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    commit();
  }

  function slotLabelForItem(item: BinderItem) {
    const page = state.pages.find((candidate) => candidate.id === item.pageId);
    const template = templateById(page?.templateId);
    return template?.slots.find((slot) => slot.id === item.slotId)?.label ?? '';
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `timeline-binder-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const parsed = JSON.parse(await file.text()) as AppState;
    if (parsed.version !== 1 || !Array.isArray(parsed.assets) || !Array.isArray(parsed.templates)) {
      throw new Error('That file does not look like a Timeline Binder export.');
    }
    state = parsed;
    activeBookletPageId = state.pages[0]?.id ?? '';
    selectedTemplateId = state.templates[0]?.id ?? '';
    templatePreviewAssetId = binderAssets[0]?.id ?? '';
    commit();
  }

  async function clearAll() {
    if (!confirm('Clear the current binder project from this browser?')) return;
    state = defaultState();
    selectedTemplateId = state.templates[0]?.id ?? '';
    templatePreviewAssetId = '';
    activeBookletPageId = '';
    selectedItemId = '';
    shadowItemId = '';
    shadowEditing = false;
    await saveStoredState(state);
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value: number) {
    return Math.round(value * 10) / 10;
  }

  function scanOptionLabel(asset: ScanAsset) {
    const side = asset.side === 'unspecified' ? '' : `, ${asset.side}`;
    return `${asset.name} (${asset.role}${side})`;
  }

  function displayItemTitle(item: BinderItem) {
    return item.title.trim() || 'Admit One';
  }

  function displayItemDate(item: BinderItem) {
    if (!item.date) return 'Undated';
    const [year, month, day] = item.date.split('-');
    return year && month && day ? `${month}/${day}/${year}` : item.date;
  }

  function displayItemPeople(item: BinderItem) {
    return item.people.trim() || 'None listed';
  }

  function locationOptionLabel(location: LocationOption) {
    return `${location.name}, ${location.region}, ${location.country} (${location.kind})`;
  }

  function displayItemLocation(item: BinderItem) {
    const location = locationById(item.locationId);
    return location ? `${location.name}, ${location.region}` : 'No location listed';
  }

  function displayItemNotes(item: BinderItem) {
    return item.notes.trim() || 'No notes yet.';
  }
</script>

<svelte:head>
  <title>Timeline Binder</title>
</svelte:head>

<main class="min-h-screen bg-neutral-950 text-neutral-100">
  <header class="border-b border-neutral-800 bg-neutral-950/90">
    <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-normal text-neutral-50">Timeline Binder</h1>
        <p class="mt-1 text-sm text-neutral-400">Build a digital booklet from binder scans, reusable stencils, and unfolded item images.</p>
      </div>

      <nav class="flex flex-wrap gap-2" aria-label="Workflow">
        <button
          class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${activeTab === 'import' ? 'bg-teal-500 text-neutral-950' : 'bg-neutral-900 text-neutral-300'}`}
          type="button"
          on:click={() => (activeTab = 'import')}
        >
          <Upload size={16} /> Import
        </button>
        <button
          class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${activeTab === 'templates' ? 'bg-teal-500 text-neutral-950' : 'bg-neutral-900 text-neutral-300'}`}
          type="button"
          on:click={() => (activeTab = 'templates')}
        >
          <Pencil size={16} /> Stencils
        </button>
        <button
          class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${activeTab === 'booklet' ? 'bg-teal-500 text-neutral-950' : 'bg-neutral-900 text-neutral-300'}`}
          type="button"
          on:click={() => (activeTab = 'booklet')}
        >
          <BookOpen size={16} /> Booklet
        </button>
        <button
          class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${activeTab === 'preview' ? 'bg-teal-500 text-neutral-950' : 'bg-neutral-900 text-neutral-300'}`}
          type="button"
          on:click={() => (activeTab = 'preview')}
        >
          <Play size={16} /> Preview
        </button>
        <button
          class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${activeTab === 'map' ? 'bg-teal-500 text-neutral-950' : 'bg-neutral-900 text-neutral-300'}`}
          type="button"
          on:click={() => (activeTab = 'map')}
        >
          <MapPinned size={16} /> Map
        </button>
        <button
          class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${activeTab === 'data' ? 'bg-teal-500 text-neutral-950' : 'bg-neutral-900 text-neutral-300'}`}
          type="button"
          on:click={() => (activeTab = 'data')}
        >
          <Download size={16} /> Data
        </button>
      </nav>
    </div>
  </header>

  {#if !ready}
    <section class="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div class="rounded-md border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">Loading binder workspace...</div>
    </section>
  {:else if activeTab === 'import'}
    <section class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr]">
      <div class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-md bg-teal-600 text-neutral-950">
            <FileArchive size={20} />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-neutral-50">Import scans</h2>
            <p class="text-sm text-neutral-400">PDF files can be selected directly or bundled inside a ZIP.</p>
          </div>
        </div>

        <label class="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-neutral-700 bg-neutral-900 px-4 py-8 text-center hover:bg-neutral-800">
          <Upload class="mb-3 text-teal-700" size={28} />
          <span class="text-sm font-medium text-neutral-100">Choose PDFs or a ZIP</span>
          <span class="mt-1 text-xs text-neutral-500">Each PDF page becomes one scan image.</span>
          <input class="sr-only" type="file" accept=".pdf,.zip,application/pdf,application/zip" multiple on:change={handleImport} />
        </label>

        <div class="mt-4 rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-100">
          {#if importBusy}
            {importStatus}
          {:else}
            {importStatus || `${state.assets.length} rendered scan${state.assets.length === 1 ? '' : 's'} in this project.`}
          {/if}
        </div>

        <div class="mt-5 space-y-3 text-sm text-neutral-400">
          <p>Mark binder-page scans as <strong>binder</strong>. Mark unfolded item scans as <strong>item</strong>. Item scans are used in the flippable shadowbox.</p>
          <p>Use the front/back side tags to make long scan lists easier to navigate.</p>
        </div>
      </div>

      <div class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-neutral-50">Scan library</h2>
          <span class="text-sm text-neutral-500">{binderAssets.length} binder / {itemAssets.length} item</span>
        </div>

        {#if state.assets.length === 0}
          <div class="mt-5 rounded-md border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
            Imported PDF pages will appear here as thumbnails.
          </div>
        {:else}
          <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {#each state.assets as asset (asset.id)}
              <article class="rounded-md border border-neutral-800 bg-neutral-900 p-3 shadow-sm">
                <div class="aspect-[3/4] overflow-hidden rounded bg-neutral-800">
                  <img class="h-full w-full object-contain" src={asset.image} alt={asset.name} />
                </div>
                <div class="mt-3 min-w-0">
                  <h3 class="truncate text-sm font-semibold text-neutral-50" title={asset.name}>{asset.name}</h3>
                  <p class="truncate text-xs text-neutral-500" title={asset.source}>{asset.source}</p>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <select
                    class="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm"
                    value={asset.role}
                    aria-label="Scan role"
                    on:change={(event) => setAssetRole(asset, (event.currentTarget as HTMLSelectElement).value as ScanRole)}
                  >
                    <option value="binder">Binder page</option>
                    <option value="item">Item scan</option>
                  </select>
                  <select
                    class="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm"
                    value={asset.side}
                    aria-label="Scan side"
                    on:change={(event) => setAssetSide(asset, (event.currentTarget as HTMLSelectElement).value as ScanSide)}
                  >
                    <option value="unspecified">No side</option>
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                  </select>
                </div>
                <button
                  class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950"
                  type="button"
                  on:click={() => removeAsset(asset.id)}
                >
                  <Trash2 size={16} /> Remove
                </button>
              </article>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {:else if activeTab === 'templates'}
    <section class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[340px_1fr_310px]">
      <aside class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <h2 class="text-lg font-semibold text-neutral-50">Stencil library</h2>
        <div class="mt-4 flex flex-wrap gap-2">
          <button class="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-teal-500" type="button" on:click={() => addTemplate('grid')}>
            <Plus size={16} /> 3x3
          </button>
          <button class="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400" type="button" on:click={() => addTemplate('photo')}>
            <Plus size={16} /> 2x2
          </button>
          <button class="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800" type="button" on:click={() => addTemplate('blank')}>
            <Plus size={16} /> Blank
          </button>
        </div>

        <div class="mt-5 space-y-2">
          {#each state.templates as template (template.id)}
            <button
              class={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-neutral-800 ${template.id === selectedTemplateId ? 'border-neutral-950 bg-teal-500 text-neutral-950' : 'border-neutral-800'}`}
              type="button"
              on:click={() => {
                selectedTemplateId = template.id;
                selectedSlotId = '';
              }}
            >
              <span class="truncate">{template.name}</span>
              <span class="ml-3 text-xs opacity-70">{template.slots.length}</span>
            </button>
          {/each}
        </div>

        <div class="mt-5 grid grid-cols-2 gap-2">
          <button class="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800" type="button" on:click={duplicateTemplate}>
            <Copy size={16} /> Copy
          </button>
          <button class="inline-flex items-center justify-center gap-2 rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950" type="button" on:click={() => selectedTemplateId && deleteTemplate(selectedTemplateId)}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </aside>

      <div class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label class="block">
            <span class="text-sm font-medium text-neutral-300">Stencil name</span>
            <input
              class="mt-1 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm"
              value={selectedTemplate?.name ?? ''}
              on:input={(event) => updateTemplateName((event.currentTarget as HTMLInputElement).value)}
            />
          </label>

          <label class="block sm:min-w-72">
            <span class="text-sm font-medium text-neutral-300">Preview scan</span>
            <select
              class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
              value={templatePreviewAsset?.id ?? ''}
              on:change={(event) => (templatePreviewAssetId = (event.currentTarget as HTMLSelectElement).value)}
            >
              {#each binderAssets as asset (asset.id)}
                <option value={asset.id}>{scanOptionLabel(asset)}</option>
              {/each}
            </select>
          </label>
        </div>

        {#if !templatePreviewAsset}
          <div class="mt-5 rounded-md border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
            Import at least one binder-page scan to draw a stencil over it.
          </div>
        {:else}
          <div class="mt-5 overflow-auto rounded-md bg-neutral-800 p-3">
            <div
              bind:this={templateCanvas}
              class="relative mx-auto max-h-[72vh] w-fit cursor-crosshair select-none overflow-hidden rounded bg-neutral-900 shadow-sm"
              role="button"
              aria-label="Stencil drawing surface. Press Enter to add a manual slot."
              tabindex="0"
              on:mousedown={startDraw}
              on:keydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') addManualSlot();
              }}
            >
              <img class="block max-h-[72vh] max-w-full" src={templatePreviewAsset.image} alt={templatePreviewAsset.name} draggable="false" />
              {#if selectedTemplate}
                {#each selectedTemplate.slots as slot (slot.id)}
                  <button
                    data-slot-id={slot.id}
                    class={`absolute flex items-start justify-start border-2 p-1 text-xs font-semibold text-neutral-50 ${slot.id === selectedSlotId ? 'border-amber-300 bg-amber-300/30' : 'border-teal-400 bg-teal-300/20'}`}
                    style={slotPositionStyle(slot)}
                    type="button"
                    title={`Slot ${slot.label}`}
                    on:mousedown={(event) => event.stopPropagation()}
                    on:click={() => (selectedSlotId = slot.id)}
                  >
                    {slot.label}
                  </button>
                {/each}
              {/if}
              {#if drawing}
                <div
                  class="absolute border-2 border-amber-400 bg-amber-300/20"
                  style={`left:${drawing.x}%;top:${drawing.y}%;width:${drawing.w}%;height:${drawing.h}%;`}
                ></div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <aside class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-neutral-50">Boundaries</h2>
          <button class="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800" type="button" on:click={addManualSlot}>
            <Plus size={16} /> Slot
          </button>
        </div>

        {#if !selectedTemplate || selectedTemplate.slots.length === 0}
          <p class="mt-4 rounded-md bg-neutral-900 p-4 text-sm text-neutral-400">Draw on the preview image or add a slot manually.</p>
        {:else}
          <div class="mt-4 space-y-3">
            {#each selectedTemplate.slots as slot (slot.id)}
              <div class={`rounded-md border p-3 ${slot.id === selectedSlotId ? 'border-neutral-950' : 'border-neutral-800'}`}>
                <div class="flex items-center gap-2">
                  <input
                    class="min-w-0 flex-1 rounded-md border border-neutral-700 px-2 py-1 text-sm"
                    value={slot.label}
                    aria-label="Slot label"
                    on:input={(event) => updateSlot(slot.id, { label: (event.currentTarget as HTMLInputElement).value })}
                    on:focus={() => (selectedSlotId = slot.id)}
                  />
                  <button class="rounded-md border border-red-900/70 p-2 text-red-300 hover:bg-red-950" type="button" aria-label="Delete slot" on:click={() => removeSlot(slot.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <label>X <input class="mt-1 w-full rounded-md border border-neutral-700 px-2 py-1" type="number" min="0" max="100" step="0.1" value={slot.x} on:input={(event) => updateSlot(slot.id, { x: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label>Y <input class="mt-1 w-full rounded-md border border-neutral-700 px-2 py-1" type="number" min="0" max="100" step="0.1" value={slot.y} on:input={(event) => updateSlot(slot.id, { y: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label>W <input class="mt-1 w-full rounded-md border border-neutral-700 px-2 py-1" type="number" min="1" max="100" step="0.1" value={slot.w} on:input={(event) => updateSlot(slot.id, { w: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label>H <input class="mt-1 w-full rounded-md border border-neutral-700 px-2 py-1" type="number" min="1" max="100" step="0.1" value={slot.h} on:input={(event) => updateSlot(slot.id, { h: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </aside>
    </section>
  {:else if activeTab === 'booklet'}
    <section class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_1fr_340px]">
      <aside class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-neutral-50">Pages</h2>
          <button class="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-teal-500" type="button" on:click={addBinderPage}>
            <Plus size={16} /> Page
          </button>
        </div>

        {#if state.pages.length === 0}
          <p class="mt-4 rounded-md bg-neutral-900 p-4 text-sm text-neutral-400">Add a page after importing binder scans and creating a stencil.</p>
        {:else}
          <div
            class="mt-4 space-y-2"
            role="list"
            aria-label="Booklet pages"
            use:dragHandleZone={{ items: state.pages, flipDurationMs: 170, dropFromOthersDisabled: true }}
            on:consider={(event) => applyPageDragOrder(event)}
            on:finalize={(event) => applyPageDragOrder(event, true)}
          >
            {#each state.pages as page, index (page.id)}
              <div
                class={`grid grid-cols-[auto_1fr_auto_auto] items-center overflow-hidden rounded-md border transition ${page.id === activePage?.id ? 'border-teal-500 bg-teal-500 text-neutral-950' : 'border-neutral-800 bg-neutral-900'}`}
                role="listitem"
              >
                <button
                  class="flex h-full cursor-grab items-center px-2 text-current hover:bg-black/10 active:cursor-grabbing"
                  type="button"
                  aria-label={`Drag ${page.title || `page ${index + 1}`}`}
                  use:dragHandle
                >
                  <GripVertical size={16} />
                </button>
                <button
                  class="flex min-w-0 items-center justify-between px-2 py-2 text-left text-sm hover:bg-black/10"
                  type="button"
                  on:click={() => {
                    activeBookletPageId = page.id;
                    selectedItemId = '';
                  }}
                >
                  <span class="truncate">{page.title || `Page ${index + 1}`}</span>
                  <span class="ml-2 text-xs opacity-70">{templateById(page.templateId)?.slots.length ?? 0}</span>
                </button>
                <button
                  class="h-full border-l border-current/20 px-2 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-35"
                  type="button"
                  aria-label={`Move ${page.title || `page ${index + 1}`} up`}
                  disabled={index === 0}
                  on:click={() => moveBinderPage(page.id, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  class="h-full border-l border-current/20 px-2 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-35"
                  type="button"
                  aria-label={`Move ${page.title || `page ${index + 1}`} down`}
                  disabled={index === state.pages.length - 1}
                  on:click={() => moveBinderPage(page.id, 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </aside>

      <div class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        {#if !activePage}
          <div class="rounded-md border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">No booklet page selected.</div>
        {:else}
          <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div class="grid flex-1 gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="text-sm font-medium text-neutral-300">Page title</span>
                <input class="mt-1 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" value={activePage.title} on:input={(event) => updatePage(activePage.id, { title: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-neutral-300">Stencil</span>
                <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={activePage.templateId ?? ''} on:change={(event) => updatePage(activePage.id, { templateId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
                  <option value="">No stencil</option>
                  {#each state.templates as template (template.id)}
                    <option value={template.id}>{template.name}</option>
                  {/each}
                </select>
              </label>
              <label class="block">
                <span class="text-sm font-medium text-neutral-300">Front scan</span>
                <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={activePage.frontScanId ?? ''} on:change={(event) => updatePage(activePage.id, { frontScanId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
                  <option value="">No front scan</option>
                  {#each binderAssets as asset (asset.id)}
                    <option value={asset.id}>{scanOptionLabel(asset)}</option>
                  {/each}
                </select>
              </label>
              <label class="block">
                <span class="text-sm font-medium text-neutral-300">Back scan</span>
                <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={activePage.backScanId ?? ''} on:change={(event) => updatePage(activePage.id, { backScanId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
                  <option value="">No back scan</option>
                  {#each binderAssets as asset (asset.id)}
                    <option value={asset.id}>{scanOptionLabel(asset)}</option>
                  {/each}
                </select>
              </label>
            </div>

            <div class="flex gap-2">
              <button class={`rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${!showBack ? 'bg-teal-500 text-neutral-950' : ''}`} type="button" on:click={() => (showBack = false)}>Front</button>
              <button class={`rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${showBack ? 'bg-teal-500 text-neutral-950' : ''}`} type="button" on:click={() => (showBack = true)}>Back</button>
              <button class="rounded-md border border-red-900/70 p-2 text-red-300 hover:bg-red-950" type="button" aria-label="Delete page" on:click={() => removeBinderPage(activePage.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div class="mt-5 overflow-auto rounded-md bg-neutral-800 p-3">
            {#if !activePageImage}
              <div class="rounded-md bg-neutral-900 p-8 text-center text-sm text-neutral-400">Choose a {showBack ? 'back' : 'front'} scan for this page.</div>
            {:else}
              <div class="relative mx-auto w-fit overflow-hidden rounded bg-neutral-900 shadow-sm">
                <img class="block max-h-[78vh] max-w-full" src={activePageImage.image} alt={activePageImage.name} />
                {#if activeTemplate}
                  {#each activeTemplate.slots as slot (slot.id)}
                    {@const item = itemForSlot(activePage.id, slot.id)}
                    <button
                      class={`absolute flex items-start justify-start border-2 p-1 text-xs font-semibold text-neutral-50 transition hover:border-amber-300 hover:bg-amber-200/30 ${item?.id === selectedItemId ? 'border-amber-400 bg-amber-200/30' : 'border-teal-300 bg-teal-300/15'}`}
                      style={slotPositionStyle(slot, showBack)}
                      type="button"
                      title={item?.title || `Slot ${slot.label}`}
                      on:click={() => selectEditorSlot(activePage, slot)}
                    >
                      {slot.label}
                    </button>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <aside class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <h2 class="text-lg font-semibold text-neutral-50">Item details</h2>
        {#if !selectedItem}
          <p class="mt-4 rounded-md bg-neutral-900 p-4 text-sm text-neutral-400">Click a boundary on the booklet page to edit its item record.</p>
        {:else}
          <div class="mt-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Slot {slotLabelForItem(selectedItem)}</p>
            <label class="block">
              <span class="text-sm font-medium text-neutral-300">Title</span>
              <input class="mt-1 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" value={selectedItem.title} on:input={(event) => updateItem(selectedItem.id, { title: (event.currentTarget as HTMLInputElement).value })} />
            </label>
            <label class="block">
              <span class="text-sm font-medium text-neutral-300">Date</span>
              <input class="mt-1 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" type="date" value={selectedItem.date} on:input={(event) => updateItem(selectedItem.id, { date: (event.currentTarget as HTMLInputElement).value })} />
            </label>
            <label class="block">
              <span class="text-sm font-medium text-neutral-300">Other people</span>
              <input class="mt-1 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" value={selectedItem.people} placeholder="Comma-separated names" on:input={(event) => updateItem(selectedItem.id, { people: (event.currentTarget as HTMLInputElement).value })} />
            </label>
            <label class="block">
              <span class="text-sm font-medium text-neutral-300">Location</span>
              <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={selectedItem.locationId ?? ''} on:change={(event) => updateItem(selectedItem.id, { locationId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
                <option value="">No location</option>
                {#each LOCATION_LIBRARY as location (location.id)}
                  <option value={location.id}>{locationOptionLabel(location)}</option>
                {/each}
              </select>
            </label>
            <label class="block">
              <span class="text-sm font-medium text-neutral-300">Unfolded front</span>
              <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={selectedItem.frontScanId ?? ''} on:change={(event) => updateItem(selectedItem.id, { frontScanId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
                <option value="">No item front</option>
                {#each itemAssets as asset (asset.id)}
                  <option value={asset.id}>{scanOptionLabel(asset)}</option>
                {/each}
              </select>
            </label>
            <label class="block">
              <span class="text-sm font-medium text-neutral-300">Unfolded back</span>
              <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={selectedItem.backScanId ?? ''} on:change={(event) => updateItem(selectedItem.id, { backScanId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
                <option value="">No item back</option>
                {#each itemAssets as asset (asset.id)}
                  <option value={asset.id}>{scanOptionLabel(asset)}</option>
                {/each}
              </select>
            </label>
            <label class="block">
              <span class="text-sm font-medium text-neutral-300">Notes</span>
              <textarea class="mt-1 min-h-28 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" value={selectedItem.notes} on:input={(event) => updateItem(selectedItem.id, { notes: (event.currentTarget as HTMLTextAreaElement).value })}></textarea>
            </label>
          </div>
        {/if}
      </aside>
    </section>
  {:else if activeTab === 'preview'}
    <section class="min-h-[calc(100vh-89px)] bg-neutral-950 px-4 py-6 text-neutral-100 sm:px-6">
      <div class="mx-auto flex max-w-7xl flex-col gap-4">
        <div class="flex flex-col gap-3 rounded-md border border-teal-900/40 bg-neutral-900 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-xl font-semibold">Preview</h2>
            <p class="mt-1 text-sm text-neutral-300">Flip through the binder and open item shadowboxes from the page boundaries.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${previewMode === 'single' ? 'bg-neutral-900 text-neutral-50' : 'text-neutral-100'}`} type="button" on:click={() => setPreviewMode('single')}>
              <BookOpen size={16} /> Single
            </button>
            <button class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${previewMode === 'double' ? 'bg-neutral-900 text-neutral-50' : 'text-neutral-100'}`} type="button" on:click={() => setPreviewMode('double')}>
              <BookOpen size={16} /> Double
            </button>
            <button class={`inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800 ${previewBorders ? 'bg-teal-400 text-neutral-950' : 'text-neutral-100'}`} type="button" on:click={() => (previewBorders = !previewBorders)}>
              <Eye size={16} /> Borders
            </button>
          </div>
        </div>

        {#if previewSides.length === 0}
          <div class="rounded-md border border-teal-900/40 bg-neutral-900 p-8 text-center text-sm text-neutral-300">
            Add booklet pages before opening the preview.
          </div>
        {:else}
          <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <button class="rounded-full border border-neutral-700 bg-neutral-800 p-3 text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-35" type="button" aria-label="Previous page" disabled={previewIndex === 0} on:click={() => movePreview(-1)}>
              <ChevronLeft size={24} />
            </button>

            <div class="relative min-h-[72vh] overflow-hidden rounded-md border border-teal-900/40 bg-[#0c0a09] p-4 shadow-2xl sm:p-6">
              <div class="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-neutral-800 lg:block"></div>
              <div class={`mx-auto grid h-full max-w-6xl gap-4 ${previewMode === 'double' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                {#each previewVisibleSides as previewSide, columnIndex (`${previewSide?.key ?? 'blank'}-${columnIndex}`)}
                  <article class="relative flex min-h-[68vh] items-center justify-center rounded bg-neutral-900 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
                    {#if previewSide}
                      {@const previewTemplate = templateById(previewSide.page.templateId)}
                      {#if previewSide.asset}
                        <div class="relative max-h-[68vh] w-fit overflow-hidden rounded bg-neutral-900">
                          <img class="block max-h-[68vh] max-w-full" src={previewSide.asset.image} alt={`${previewSide.page.title} ${previewSide.side}`} />
                          {#if previewTemplate}
                            {#each previewTemplate.slots as slot (slot.id)}
                              {@const item = itemForSlot(previewSide.page.id, slot.id)}
                              <button
                                class={`absolute border-2 transition hover:border-amber-300 ${previewBorders ? 'border-teal-300' : 'border-transparent'}`}
                                style={slotPositionStyle(slot, previewSide.side === 'back')}
                                type="button"
                                aria-label={item?.title || `Open item ${slot.label}`}
                                title={item?.title || `Open item ${slot.label}`}
                                on:click={() => openPreviewSlot(previewSide.page, slot, previewSide.side)}
                              ></button>
                            {/each}
                          {/if}
                        </div>
                      {:else}
                        <div class="rounded-md border border-teal-900/40 px-5 py-4 text-sm text-neutral-300">
                          No {previewSide.side} scan selected for {previewSide.page.title}.
                        </div>
                      {/if}
                    {:else}
                      <div class="h-full min-h-[48vh] w-full rounded bg-neutral-950/60"></div>
                    {/if}
                  </article>
                {/each}
              </div>
            </div>

            <button class="rounded-full border border-neutral-700 bg-neutral-800 p-3 text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-35" type="button" aria-label="Next page" disabled={previewIndex >= previewMaxIndex} on:click={() => movePreview(1)}>
              <ChevronRight size={24} />
            </button>
          </div>

          <div class="flex items-center justify-center text-sm text-neutral-300">
            {#if previewMode === 'double'}
              Spread {Math.min(previewIndex + 1, previewSpreads.length)} of {previewSpreads.length}
            {:else}
              Side {Math.min(previewIndex + 1, previewSides.length)} of {previewSides.length}
            {/if}
          </div>
        {/if}
      </div>
    </section>
  {:else if activeTab === 'map'}
    <section class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div class="flex flex-col gap-4">
        <div class="rounded-md border border-teal-900/40 bg-neutral-900 p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-xl font-semibold text-neutral-50">Location Map</h2>
              <p class="mt-1 text-sm text-neutral-300">{mapPins.length} mapped location{mapPins.length === 1 ? '' : 's'} from {state.items.filter((item) => item.locationId).length} item{state.items.filter((item) => item.locationId).length === 1 ? '' : 's'}.</p>
            </div>
            <div class="inline-flex w-fit items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300">
              <MapPinned size={16} /> North America
            </div>
          </div>
        </div>

        {#if mapPins.length === 0}
          <div class="rounded-md border border-neutral-800 bg-neutral-900 p-8 text-center text-sm text-neutral-400">
            Add locations to item records to place pins on this map.
          </div>
        {:else}
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div class="relative min-h-[520px] overflow-hidden rounded-md border border-neutral-800 bg-[#0b1720]">
              <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" role="img" aria-label="Map of North America, Central America, and the Caribbean" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mapWater" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stop-color="#102a33" />
                    <stop offset="100%" stop-color="#071116" />
                  </linearGradient>
                  <linearGradient id="mapLand" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stop-color="#27534f" />
                    <stop offset="100%" stop-color="#16362f" />
                  </linearGradient>
                </defs>
                <rect width="100" height="100" fill="url(#mapWater)" />
                <path d="M7 18 C14 5 32 3 44 8 C54 12 62 9 72 17 C84 26 84 38 76 47 C70 54 66 63 57 64 C47 65 38 59 29 57 C18 55 10 50 7 40 C4 31 2 25 7 18 Z" fill="url(#mapLand)" opacity="0.92" />
                <path d="M25 51 C35 52 43 55 49 61 C53 66 59 68 64 70 C68 72 69 76 65 78 C59 80 52 76 47 72 C41 67 36 64 29 61 C23 59 20 55 25 51 Z" fill="url(#mapLand)" opacity="0.88" />
                <path d="M76 41 C82 42 88 45 91 51 C94 56 90 63 84 62 C78 61 75 56 73 51 C72 47 72 43 76 41 Z" fill="url(#mapLand)" opacity="0.82" />
                <path d="M67 72 C73 72 76 76 81 77 C86 78 90 79 93 83" fill="none" stroke="#2f6f66" stroke-width="2" stroke-linecap="round" opacity="0.9" />
                <path d="M43 85 C48 83 54 82 60 84" fill="none" stroke="#2f6f66" stroke-width="2" stroke-linecap="round" opacity="0.85" />
                <path d="M0 35 H100 M0 55 H100 M0 75 H100 M20 0 V100 M40 0 V100 M60 0 V100 M80 0 V100" stroke="#d1d5db" stroke-width="0.16" opacity="0.15" />
                <text x="18" y="28" fill="#d1d5db" font-size="3.2" opacity="0.55">North America</text>
                <text x="49" y="76" fill="#d1d5db" font-size="2.4" opacity="0.5">Central America</text>
                <text x="75" y="72" fill="#d1d5db" font-size="2.4" opacity="0.5">Caribbean</text>
              </svg>

              {#each mapPins as pin (pin.location.id)}
                <button
                  class="absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1 rounded-full text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] transition hover:scale-110 focus-visible:scale-110"
                  style={mapPinStyle(pin)}
                  type="button"
                  aria-label={`Open ${pin.location.name}`}
                  title={`${locationOptionLabel(pin.location)} - ${pin.items.length} item${pin.items.length === 1 ? '' : 's'}`}
                  on:click={() => openItemShadowbox(pin.items[0].id)}
                >
                  <MapPinned size={28} fill="currentColor" />
                  <span class="rounded bg-neutral-950/85 px-2 py-0.5 text-[11px] font-semibold text-neutral-100 shadow-md">{pin.items.length}</span>
                </button>
              {/each}
            </div>

            <aside class="max-h-[640px] overflow-auto rounded-md border border-neutral-800 bg-neutral-900 p-4">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Mapped items</h3>
              <div class="mt-4 space-y-3">
                {#each mapPins as pin (pin.location.id)}
                  <article class="rounded-md border border-neutral-800 bg-neutral-950 p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <h4 class="font-semibold text-neutral-50">{pin.location.name}</h4>
                        <p class="mt-1 text-xs text-neutral-400">{pin.location.region}, {pin.location.country} · {pin.location.kind}</p>
                      </div>
                      <span class="rounded-md bg-teal-500 px-2 py-1 text-xs font-semibold text-neutral-950">{pin.items.length}</span>
                    </div>
                    <div class="mt-3 grid gap-2">
                      {#each pin.items as item (item.id)}
                        <button class="rounded-md border border-neutral-800 px-3 py-2 text-left text-sm hover:border-teal-500 hover:bg-neutral-800" type="button" on:click={() => openItemShadowbox(item.id)}>
                          <span class="block font-medium text-neutral-100">{displayItemTitle(item)}</span>
                          <span class="mt-1 block text-xs text-neutral-500">{displayItemDate(item)}</span>
                        </button>
                      {/each}
                    </div>
                  </article>
                {/each}
              </div>
            </aside>
          </div>
        {/if}
      </div>
    </section>
  {:else}
    <section class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div class="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <h2 class="text-lg font-semibold text-neutral-50">Backup and restore</h2>
        <p class="mt-2 text-sm text-neutral-400">The app auto-saves into this browser using IndexedDB. Export a JSON copy when you want a portable archive of the booklet data and rendered scan images.</p>

        <div class="mt-5 flex flex-wrap gap-3">
          <button class="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-teal-500" type="button" on:click={exportJson}>
            <Download size={16} /> Export JSON
          </button>
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800">
            <Upload size={16} /> Import JSON
            <input class="sr-only" type="file" accept="application/json,.json" on:change={importJson} />
          </label>
          <button class="inline-flex items-center gap-2 rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950" type="button" on:click={clearAll}>
            <Trash2 size={16} /> Clear browser copy
          </button>
        </div>

        <dl class="mt-6 grid gap-3 text-sm sm:grid-cols-4">
          <div class="rounded-md bg-neutral-900 p-3">
            <dt class="text-neutral-500">Scans</dt>
            <dd class="mt-1 text-xl font-semibold">{state.assets.length}</dd>
          </div>
          <div class="rounded-md bg-neutral-900 p-3">
            <dt class="text-neutral-500">Stencils</dt>
            <dd class="mt-1 text-xl font-semibold">{state.templates.length}</dd>
          </div>
          <div class="rounded-md bg-neutral-900 p-3">
            <dt class="text-neutral-500">Pages</dt>
            <dd class="mt-1 text-xl font-semibold">{state.pages.length}</dd>
          </div>
          <div class="rounded-md bg-neutral-900 p-3">
            <dt class="text-neutral-500">Items</dt>
            <dd class="mt-1 text-xl font-semibold">{state.items.length}</dd>
          </div>
        </dl>
      </div>
    </section>
  {/if}

  {#if shadowItem}
    {@const front = assetById(shadowItem.frontScanId)}
    {@const back = assetById(shadowItem.backScanId)}
    <div class="fixed inset-0 z-50 overflow-auto bg-black/95" role="dialog" aria-modal="true">
      <div class="fixed right-4 top-4 z-20 flex gap-2">
        <button class="rounded-full border border-neutral-700 bg-neutral-950/75 p-3 text-neutral-100 shadow-lg backdrop-blur hover:bg-neutral-800" type="button" aria-label="Flip item" title="Flip" on:click={() => (shadowFlipped = !shadowFlipped)}>
          <FlipHorizontal size={18} />
        </button>
        <button
          class={`rounded-full border p-3 shadow-lg backdrop-blur ${shadowEditing ? 'border-teal-400 bg-teal-400 text-neutral-950 hover:bg-teal-300' : 'border-neutral-700 bg-neutral-950/75 text-neutral-100 hover:bg-neutral-800'}`}
          type="button"
          aria-label="Edit item details"
          title="Edit"
          on:click={() => (shadowEditing = !shadowEditing)}
        >
          <Pencil size={18} />
        </button>
        <button class="rounded-full border border-neutral-700 bg-neutral-950/75 p-3 text-neutral-100 shadow-lg backdrop-blur hover:bg-neutral-800" type="button" aria-label="Close shadowbox" title="Close" on:click={closeShadowbox}>
          <X size={18} />
        </button>
      </div>

      <div class="flex min-h-screen flex-col items-center justify-center gap-5 px-4 py-20">
        <div class="contents">
          <div class="flip-card h-[min(72vh,760px)] min-h-[320px] w-full max-w-6xl">
            <div class={`flip-card-inner relative h-full w-full ${shadowFlipped ? 'is-flipped' : ''}`}>
              <div class="flip-card-face absolute inset-0 flex items-center justify-center">
                {#if front}
                  <img class="max-h-full max-w-full rounded object-contain shadow-2xl" src={front.image} alt={`${displayItemTitle(shadowItem)} front`} />
                {:else}
                  <div class="relative flex aspect-[5/2] w-full max-w-3xl overflow-hidden rounded-md border border-amber-500/70 bg-amber-100 text-neutral-950 shadow-2xl">
                    <div class="flex flex-1 flex-col justify-between p-6 sm:p-8">
                      <div class="flex items-center justify-between gap-4 border-b border-dashed border-neutral-700/50 pb-4">
                        <span class="text-xs font-bold uppercase tracking-[0.28em] text-teal-800">Admit One</span>
                        <span class="rounded border border-neutral-800 px-2 py-1 text-xs font-semibold uppercase">{displayItemDate(shadowItem)}</span>
                      </div>
                      <div class="py-5">
                        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-600">Timeline Binder</p>
                        <h3 class="mt-2 break-words text-3xl font-black leading-tight sm:text-5xl">{displayItemTitle(shadowItem)}</h3>
                      </div>
                      <div class="flex items-center justify-between border-t border-dashed border-neutral-700/50 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600">
                        <span>General Admission</span>
                        <span>Keep This Stub</span>
                      </div>
                    </div>
                    <div class="flex w-24 flex-col items-center justify-center border-l border-dashed border-neutral-700/60 bg-amber-200 px-3 text-center sm:w-32">
                      <span class="rotate-90 whitespace-nowrap text-sm font-black uppercase tracking-[0.28em] text-neutral-700">Ticket</span>
                    </div>
                  </div>
                {/if}
              </div>
              <div class="flip-card-face flip-card-back absolute inset-0 flex items-center justify-center">
                {#if back}
                  <img class="max-h-full max-w-full rounded object-contain shadow-2xl" src={back.image} alt={`${displayItemTitle(shadowItem)} back`} />
                {:else}
                  <div class="relative flex aspect-[5/2] w-full max-w-3xl overflow-hidden rounded-md border border-teal-500/70 bg-neutral-100 text-neutral-950 shadow-2xl">
                    <div class="flex w-24 flex-col items-center justify-center border-r border-dashed border-neutral-700/60 bg-teal-200 px-3 text-center sm:w-32">
                      <span class="rotate-90 whitespace-nowrap text-sm font-black uppercase tracking-[0.28em] text-neutral-700">Details</span>
                    </div>
                    <div class="grid flex-1 gap-4 p-6 sm:grid-cols-2 sm:p-8">
                      <div class="sm:col-span-2">
                        <p class="text-xs font-bold uppercase tracking-[0.24em] text-teal-800">Back of Ticket</p>
                        <h3 class="mt-2 break-words text-2xl font-black leading-tight sm:text-4xl">{displayItemTitle(shadowItem)}</h3>
                      </div>
                      <div class="rounded border border-dashed border-neutral-500/70 p-3">
                        <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Date</p>
                        <p class="mt-2 text-lg font-semibold">{displayItemDate(shadowItem)}</p>
                      </div>
                      <div class="rounded border border-dashed border-neutral-500/70 p-3">
                        <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Location</p>
                        <p class="mt-2 text-sm font-semibold">{displayItemLocation(shadowItem)}</p>
                      </div>
                      <div class="rounded border border-dashed border-neutral-500/70 p-3">
                        <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Other People</p>
                        <p class="mt-2 whitespace-pre-wrap text-sm font-medium">{displayItemPeople(shadowItem)}</p>
                      </div>
                      <div class="rounded border border-dashed border-neutral-500/70 p-3 sm:col-span-2">
                        <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Notes</p>
                        <p class="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-sm font-medium">{displayItemNotes(shadowItem)}</p>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          {#if !shadowEditing}
            <section class="max-w-3xl text-center text-neutral-100 drop-shadow-2xl">
              <h2 class="text-2xl font-semibold">{displayItemTitle(shadowItem)}</h2>
              <p class="mt-2 text-sm uppercase tracking-[0.18em] text-teal-300">{displayItemDate(shadowItem)}</p>
              {#if locationById(shadowItem.locationId)}
                <p class="mt-2 text-sm text-amber-200">{displayItemLocation(shadowItem)}</p>
              {/if}
              <p class="mt-3 text-sm text-neutral-300">{displayItemPeople(shadowItem)}</p>
              <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-200">{displayItemNotes(shadowItem)}</p>
            </section>
          {/if}
        </div>

        {#if shadowEditing}
          <section class="fixed bottom-4 left-4 right-4 z-20 mx-auto max-w-3xl rounded-md border border-neutral-800 bg-neutral-950/90 p-4 text-neutral-100 shadow-2xl backdrop-blur md:left-auto md:right-4 md:mx-0 md:max-w-sm">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">Edit item</h2>
              <button class="rounded-md border border-neutral-700 p-2 hover:bg-neutral-800" type="button" aria-label="Close editor" on:click={() => (shadowEditing = false)}>
                <X size={16} />
              </button>
            </div>
            <div class="mt-4 grid gap-3">
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Title</span>
                <input class="mt-1 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" value={shadowItem.title} on:input={(event) => updateItem(shadowItem.id, { title: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Date</span>
                <input class="mt-1 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" type="date" value={shadowItem.date} on:input={(event) => updateItem(shadowItem.id, { date: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Other people</span>
                <input class="mt-1 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" value={shadowItem.people} on:input={(event) => updateItem(shadowItem.id, { people: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Location</span>
                <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={shadowItem.locationId ?? ''} on:change={(event) => updateItem(shadowItem.id, { locationId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
                  <option value="">No location</option>
                  {#each LOCATION_LIBRARY as location (location.id)}
                    <option value={location.id}>{locationOptionLabel(location)}</option>
                  {/each}
                </select>
              </label>
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Notes</span>
                <textarea class="mt-1 min-h-24 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm" value={shadowItem.notes} on:input={(event) => updateItem(shadowItem.id, { notes: (event.currentTarget as HTMLTextAreaElement).value })}></textarea>
              </label>
            </div>
          </section>
        {/if}
      </div>
    </div>
  {/if}
</main>





