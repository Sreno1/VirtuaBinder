<script lang="ts">
  import { Eye, FileArchive, Upload } from '@lucide/svelte';
  import BookletPageList from './BookletPageList.svelte';
  import CropFromScanModal from './CropFromScanModal.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ImportStagingModal from './ImportStagingModal.svelte';
  import LocationInput from './LocationInput.svelte';
  import MediaLibraryPanel from './MediaLibraryPanel.svelte';
  import PageScanPickerModal from './PageScanPickerModal.svelte';
  import Panel from './ui/Panel.svelte';
  import { tooltip } from '../actions/tooltip';
  import { slotPositionStyle } from '../domain/geometry';
  import { displayItemTitle } from '../domain/items';
  import { itemForSlot } from '../domain/project';
  import { scanOptionLabel } from '../domain/scans';
  import { binderStore, selectAssets } from '../state/binderStore';
  import type { ScanRole, ScanSide, StagedImportCandidate } from '../types';

  type ImportContext = {
    role: ScanRole;
    side: ScanSide;
    title: string;
    assignPage?: { pageId: string; side: 'front' | 'back' };
  };

  const defaultImportContext: ImportContext = {
    role: 'binder',
    side: 'unspecified',
    title: 'Import media'
  };

  let importOpen = false;
  let importContext: ImportContext = defaultImportContext;
  let cropItemId = '';
  let cropInitialSide: 'front' | 'back' = 'front';
  let pageScanPicker: { pageId: string; side: 'front' | 'back'; title: string } | null = null;

  $: project = $binderStore.project;
  $: ui = $binderStore.ui;
  $: assets = selectAssets(project);
  $: selectedItem = project.items.find((item) => item.id === ui.selectedItemId);
  $: selectedLooseItem = selectedItem?.kind === 'loose' ? selectedItem : undefined;
  $: activePage = selectedLooseItem
    ? undefined
    : (project.pages.find((page) => page.id === ui.activeBookletPageId) ?? project.pages[0]);
  $: activeTemplate = project.templates.find((template) => template.id === activePage?.templateId);
  $: pageAsset = activePage
    ? project.assets.find((asset) => asset.id === (ui.showBack ? activePage.backScanId : activePage.frontScanId))
    : undefined;
  $: selectedFrontAsset = project.assets.find((asset) => asset.id === selectedItem?.frontScanId);
  $: selectedBackAsset = project.assets.find((asset) => asset.id === selectedItem?.backScanId);
  $: cropItem = project.items.find((item) => item.id === cropItemId);
  $: binderStore.syncLocationInput(selectedItem, 'item');

  function openImporter(context: Partial<ImportContext> = {}) {
    importContext = { ...defaultImportContext, ...context };
    importOpen = true;
  }

  function commitImport(candidates: StagedImportCandidate[]) {
    binderStore.commitImportedAssets(candidates, importContext.assignPage);
  }

  function importJson(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) void binderStore.importJson(file);
    (event.currentTarget as HTMLInputElement).value = '';
  }

  function openCropModal(itemId: string, side: 'front' | 'back' = 'front') {
    cropItemId = itemId;
    cropInitialSide = side;
  }

  function pageSideId(pageSide: 'front' | 'back') {
    return pageSide === 'front' ? activePage?.frontScanId : activePage?.backScanId;
  }

  function pageSideAsset(pageSide: 'front' | 'back') {
    const id = pageSideId(pageSide);
    return project.assets.find((asset) => asset.id === id);
  }
</script>

<section class="max-w-none space-y-3 px-3 py-3 sm:px-4">
  <MediaLibraryPanel assets={project.assets} onUpload={() => openImporter()} />

  <div class="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)_22rem] xl:grid-cols-[20rem_minmax(0,1fr)_23rem]">
    <Panel className="lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-7rem)] lg:flex-col lg:overflow-hidden">
      <div class="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <BookletPageList pages={project.pages} items={project.items} activePageId={activePage?.id ?? ''} selectedItemId={ui.selectedItemId} />
      </div>
    </Panel>

    <Panel className="min-w-0">
    {#if project.assets.length === 0 && project.pages.length === 0 && project.items.length === 0}
      <div class="rounded-md border border-dashed border-neutral-700 bg-neutral-950 p-6">
        <div class="flex h-12 w-12 items-center justify-center rounded-md bg-teal-400 text-neutral-950">
          <FileArchive size={24} />
        </div>
        <h2 class="mt-5 text-2xl font-semibold text-neutral-50">Start by importing scans</h2>
        <div class="mt-3 space-y-3 text-sm leading-6 text-neutral-400">
          <p>Import a single PDF, a multipage PDF, standalone JPG/PNG/WebP scans, or a ZIP containing any mix of those files.</p>
          <p>Nothing is saved to the media library immediately. The import review lets you mark each rendered page as a binder page scan or an item scan, name it, tag front/back sides, and crop item fronts or backs before committing.</p>
          <p>After media is committed, add empty booklet pages and assign page scans manually, or crop item images from any saved scan.</p>
        </div>
        <div class="mt-5 flex flex-wrap gap-3">
          <button class="inline-flex items-center gap-2 rounded-md bg-teal-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-teal-300" type="button" on:click={() => openImporter({ title: 'Import scans for this booklet' })}>
            <Upload size={16} /> Import scans
          </button>
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800">
            <Upload size={16} /> Restore JSON export
            <input class="sr-only" type="file" accept="application/json,.json" on:change={importJson} />
          </label>
        </div>
        {#if ui.importStatus}
          <p class="mt-4 rounded-md bg-neutral-900 p-3 text-sm text-neutral-300">{ui.importStatus}</p>
        {/if}
      </div>
    {:else if selectedLooseItem}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-neutral-50">{displayItemTitle(selectedLooseItem)}</h2>
          <p class="mt-1 text-sm text-neutral-400">Inserted item between binder pages.</p>
        </div>
        <button class="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800" type="button" on:click={() => binderStore.openItemShadowbox(selectedLooseItem.id)}>
          <Eye size={16} /> Preview item
        </button>
      </div>
      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <div class="flex min-h-72 items-center justify-center overflow-hidden rounded-md bg-neutral-950 p-3">
          {#if selectedFrontAsset}
            <img class="max-h-[52vh] max-w-full object-contain" src={selectedFrontAsset.image} alt={`${displayItemTitle(selectedLooseItem)} front`} />
          {:else}
            <EmptyState text="No front image assigned yet. Choose an item scan or crop from a source scan." />
          {/if}
        </div>
        <div class="flex min-h-72 items-center justify-center overflow-hidden rounded-md bg-neutral-950 p-3">
          {#if selectedBackAsset}
            <img class="max-h-[52vh] max-w-full object-contain" src={selectedBackAsset.image} alt={`${displayItemTitle(selectedLooseItem)} back`} />
          {:else}
            <EmptyState text="No back image assigned yet. Choose an item scan or crop from a source scan." />
          {/if}
        </div>
      </div>
    {:else if !activePage}
      <EmptyState text="Add an empty booklet page, import media, or insert a standalone item to begin." />
    {:else}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label class="block">
          <span class="text-sm font-medium text-neutral-400">Page title</span>
          <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={activePage.title} on:input={(event) => binderStore.updatePage(activePage.id, { title: (event.currentTarget as HTMLInputElement).value })} />
        </label>
        <div class="flex rounded-md border border-neutral-700 bg-neutral-950 p-1">
          <button class={`rounded px-3 py-1.5 text-sm font-medium ${!ui.showBack ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => binderStore.setShowBack(false)}>Front</button>
          <button class={`rounded px-3 py-1.5 text-sm font-medium ${ui.showBack ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => binderStore.setShowBack(true)}>Back</button>
        </div>
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <label class="block">
          <span class="text-sm font-medium text-neutral-400">Stencil</span>
          <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={activePage.templateId ?? ''} on:change={(event) => binderStore.updatePage(activePage.id, { templateId: (event.currentTarget as HTMLSelectElement).value })}>
            {#each project.templates as template (template.id)}
              <option value={template.id}>{template.name}</option>
            {/each}
          </select>
        </label>
        <div class="space-y-3">
          {#each ['front', 'back'] as pageSide}
            <div class="rounded-md border border-neutral-800 bg-neutral-950 p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-sm font-medium capitalize text-neutral-300">{pageSide} scan</span>
                <button class="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-800" type="button" on:click={() => openImporter({ role: 'binder', side: pageSide as ScanSide, title: `Upload ${pageSide} page scan`, assignPage: { pageId: activePage.id, side: pageSide as 'front' | 'back' } })} use:tooltip={`Import new media and assign the first page scan to this ${pageSide} side`}>
                  <Upload size={15} /> Upload new
                </button>
              </div>
              <button
                class="mt-2 min-h-10 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-sm hover:bg-neutral-800"
                type="button"
                on:click={() => (pageScanPicker = { pageId: activePage.id, side: pageSide as 'front' | 'back', title: activePage.title })}
                use:tooltip={`Open a searchable grid of existing ${pageSide} page scans`}
              >
                <span class="block truncate">{pageSideAsset(pageSide as 'front' | 'back')?.name ?? 'Select existing page scan'}</span>
              </button>
            </div>
          {/each}
        </div>
      </div>

      <div class="mt-5 overflow-auto rounded-md bg-neutral-950 p-3">
        {#if !pageAsset}
          <div class="rounded-md border border-dashed border-neutral-700 p-6 text-center">
            <p class="text-sm text-neutral-400">No {ui.showBack ? 'back' : 'front'} binder scan is assigned to this page.</p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
              <button class="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800" type="button" on:click={() => (pageScanPicker = { pageId: activePage.id, side: ui.showBack ? 'back' : 'front', title: activePage.title })} use:tooltip={'Open the media library picker for this page side'}>
                Select existing page scan
              </button>
              <button class="inline-flex items-center gap-2 rounded-md bg-teal-400 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-teal-300" type="button" on:click={() => openImporter({ role: 'binder', side: ui.showBack ? 'back' : 'front', title: `Upload ${ui.showBack ? 'back' : 'front'} page scan`, assignPage: { pageId: activePage.id, side: ui.showBack ? 'back' : 'front' } })} use:tooltip={'Import new media and assign the first committed page scan here'}>
                <Upload size={16} /> Upload new page scan
              </button>
            </div>
          </div>
        {:else}
          <div class="relative mx-auto w-fit overflow-hidden rounded bg-neutral-900">
            <img class="block max-h-[72vh] max-w-full" src={pageAsset.image} alt={`${activePage.title} ${ui.showBack ? 'back' : 'front'}`} />
            {#if activeTemplate}
              {#each activeTemplate.slots as slot (slot.id)}
                {@const item = itemForSlot(project.items, activePage.id, slot.id)}
                <button
                  class={`absolute border-2 bg-transparent transition hover:border-amber-300 ${item?.id === ui.selectedItemId ? 'border-amber-300' : 'border-teal-400'}`}
                  style={slotPositionStyle(slot, ui.showBack)}
                  type="button"
                  title={item ? displayItemTitle(item) : `Slot ${slot.label}`}
                  on:click={() => binderStore.selectEditorSlot(activePage, slot)}
                ></button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
    </Panel>

    <Panel className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
    <h2 class="text-lg font-semibold text-neutral-50">Item details</h2>
    {#if !selectedItem}
      <p class="mt-4 text-sm text-neutral-400">{activePage ? 'Click a boundary on the page to edit that item.' : 'Add a booklet page or inserted item first.'}</p>
    {:else}
      <div class="mt-4 space-y-3">
        <label class="block">
          <span class="text-sm font-medium text-neutral-400">Name</span>
          <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={selectedItem.title} on:input={(event) => binderStore.updateItem(selectedItem.id, { title: (event.currentTarget as HTMLInputElement).value })} />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-neutral-400">Date</span>
          <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" type="date" value={selectedItem.date} on:input={(event) => binderStore.updateItem(selectedItem.id, { date: (event.currentTarget as HTMLInputElement).value })} />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-neutral-400">Other people</span>
          <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={selectedItem.people} on:input={(event) => binderStore.updateItem(selectedItem.id, { people: (event.currentTarget as HTMLInputElement).value })} />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-neutral-400">Location</span>
          <LocationInput item={selectedItem} context="item" search={ui.itemLocationSearch} focused={ui.itemLocationFocused} />
        </label>

        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-md bg-neutral-950 p-2">
            <p class="text-xs font-medium text-neutral-400">Front preview</p>
            <div class="mt-2 flex aspect-[3/2] items-center justify-center overflow-hidden rounded bg-neutral-900">
              {#if selectedFrontAsset}
                <img class="h-full w-full object-contain" src={selectedFrontAsset.image} alt={`${displayItemTitle(selectedItem)} front`} />
              {:else}
                <span class="px-2 text-center text-xs text-neutral-500">Fake ticket</span>
              {/if}
            </div>
          </div>
          <div class="rounded-md bg-neutral-950 p-2">
            <p class="text-xs font-medium text-neutral-400">Back preview</p>
            <div class="mt-2 flex aspect-[3/2] items-center justify-center overflow-hidden rounded bg-neutral-900">
              {#if selectedBackAsset}
                <img class="h-full w-full object-contain" src={selectedBackAsset.image} alt={`${displayItemTitle(selectedItem)} back`} />
              {:else}
                <span class="px-2 text-center text-xs text-neutral-500">Fake back</span>
              {/if}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <label class="block">
            <span class="text-sm font-medium text-neutral-400">Item front</span>
            <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={selectedItem.frontScanId ?? ''} on:change={(event) => binderStore.updateItem(selectedItem.id, { frontScanId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
              <option value="">Fake ticket</option>
              {#each assets.itemAssets as asset (asset.id)}
                <option value={asset.id}>{scanOptionLabel(asset)}</option>
              {/each}
            </select>
          </label>
          <label class="block">
            <span class="text-sm font-medium text-neutral-400">Item back</span>
            <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={selectedItem.backScanId ?? ''} on:change={(event) => binderStore.updateItem(selectedItem.id, { backScanId: (event.currentTarget as HTMLSelectElement).value || undefined })}>
              <option value="">Fake back</option>
              {#each assets.itemAssets as asset (asset.id)}
                <option value={asset.id}>{scanOptionLabel(asset)}</option>
              {/each}
            </select>
          </label>
        </div>
        <label class="block">
          <span class="text-sm font-medium text-neutral-400">Notes</span>
          <textarea class="mt-1 min-h-28 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={selectedItem.notes} on:input={(event) => binderStore.updateItem(selectedItem.id, { notes: (event.currentTarget as HTMLTextAreaElement).value })}></textarea>
        </label>
        <div class="grid gap-2">
          <button class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800" type="button" on:click={() => openCropModal(selectedItem.id)}>
            <Upload size={16} /> Crop from scan
          </button>
          <button class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800" type="button" on:click={() => binderStore.openItemShadowbox(selectedItem.id)}>
            <Eye size={16} /> Preview item
          </button>
        </div>
      </div>
    {/if}
    </Panel>
  </div>

  {#if importOpen}
    <ImportStagingModal
      title={importContext.title}
      initialRole={importContext.role}
      initialSide={importContext.side}
      onClose={() => (importOpen = false)}
      onCommit={commitImport}
    />
  {/if}

  {#if cropItem}
    <CropFromScanModal
      item={cropItem}
      assets={project.assets}
      initialSide={cropInitialSide}
      onClose={() => (cropItemId = '')}
      onUploadSource={() => {
        cropItemId = '';
        openImporter({ title: 'Upload source scan for cropping' });
      }}
    />
  {/if}

  {#if pageScanPicker}
    <PageScanPickerModal
      assets={assets.binderAssets}
      side={pageScanPicker.side}
      pageTitle={pageScanPicker.title}
      onClose={() => (pageScanPicker = null)}
      onSelect={(assetId) => {
        if (pageScanPicker) {
          binderStore.updatePage(pageScanPicker.pageId, {
            [pageScanPicker.side === 'front' ? 'frontScanId' : 'backScanId']: assetId
          });
        }
      }}
    />
  {/if}
</section>
