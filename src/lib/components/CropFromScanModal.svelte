<script lang="ts">
  import { Crop, Search, Upload, X } from '@lucide/svelte';
  import { tooltip } from '../actions/tooltip';
  import { clamp, round } from '../domain/id';
  import { scanOptionLabel } from '../domain/scans';
  import { binderStore } from '../state/binderStore';
  import type { BinderItem, DrawRect, ScanAsset } from '../types';

  export let item: BinderItem;
  export let assets: ScanAsset[] = [];
  export let initialSide: 'front' | 'back' = 'front';
  export let onClose: () => void = () => {};
  export let onUploadSource: () => void = () => {};

  let cropCanvas: HTMLDivElement;
  let sourceAssetId = '';
  let side: 'front' | 'back' = initialSide;
  let drawing: DrawRect | null = null;
  let cropBusy = false;
  let status = '';
  let query = '';

  $: sourceAsset = assets.find((asset) => asset.id === sourceAssetId);
  $: if (sourceAssetId && !assets.some((asset) => asset.id === sourceAssetId)) sourceAssetId = '';
  $: filteredAssets = assets.filter((asset) => {
    const search = query.trim().toLowerCase();
    return !search || `${asset.name} ${asset.source} ${scanOptionLabel(asset)}`.toLowerCase().includes(search);
  });

  function pointerPercent(event: MouseEvent) {
    const rect = cropCanvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
    };
  }

  function startDraw(event: MouseEvent) {
    if (!sourceAsset || cropBusy) return;
    const point = pointerPercent(event);
    drawing = { startX: point.x, startY: point.y, x: point.x, y: point.y, w: 0, h: 0 };
    status = '';
  }

  function moveDraw(event: MouseEvent) {
    if (!drawing) return;
    const point = pointerPercent(event);
    drawing = {
      ...drawing,
      x: round(Math.min(drawing.startX, point.x)),
      y: round(Math.min(drawing.startY, point.y)),
      w: round(Math.abs(point.x - drawing.startX)),
      h: round(Math.abs(point.y - drawing.startY))
    };
  }

  async function finishDraw() {
    if (!drawing || !sourceAsset) return;
    const rect = drawing;
    drawing = null;
    if (rect.w <= 2 || rect.h <= 2) return;

    cropBusy = true;
    status = `Cropping ${side}...`;
    try {
      await binderStore.cropItemFromAsset(item.id, sourceAsset.id, side, rect);
      status = `Assigned cropped ${side}.`;
    } catch (error) {
      status = error instanceof Error ? error.message : 'Crop failed.';
    } finally {
      cropBusy = false;
    }
  }
</script>

<svelte:window on:mousemove={moveDraw} on:mouseup={finishDraw} />

<div class="fixed inset-0 z-50 overflow-auto bg-black/90 p-4" role="dialog" aria-modal="true">
  <div class="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col rounded-md border border-neutral-800 bg-neutral-950 shadow-2xl">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-md bg-amber-300 text-neutral-950">
          <Crop size={20} />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-neutral-50">Crop from scan</h2>
          <p class="text-sm text-neutral-400">Draw around the item side at full size.</p>
        </div>
      </div>
      <button class="rounded-md border border-neutral-700 p-2 text-neutral-200 hover:bg-neutral-800" type="button" aria-label="Close cropper" on:click={onClose}>
        <X size={18} />
      </button>
    </header>

    <div class="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section class="overflow-auto rounded-md bg-neutral-900 p-3">
        {#if sourceAsset}
          <div
            bind:this={cropCanvas}
            class="relative mx-auto w-fit cursor-crosshair select-none overflow-hidden rounded bg-neutral-950"
            role="button"
            tabindex="0"
            aria-label="Draw crop rectangle"
            on:mousedown={startDraw}
          >
            <img class="block max-h-[76vh] max-w-full" src={sourceAsset.image} alt={sourceAsset.name} draggable="false" />
            {#if drawing}
              <div class="absolute border-2 border-amber-400 bg-amber-300/20" style={`left:${drawing.x}%;top:${drawing.y}%;width:${drawing.w}%;height:${drawing.h}%;`}></div>
            {/if}
          </div>
        {:else}
          <div class="flex h-full min-h-96 items-center justify-center rounded-md border border-dashed border-neutral-700 p-8 text-center text-sm text-neutral-500">
            Select a source scan from the grid to begin cropping.
          </div>
        {/if}
      </section>

      <aside class="space-y-4 rounded-md border border-neutral-800 bg-neutral-900 p-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Source scan</h3>
          <button class="inline-flex items-center justify-center gap-2 rounded-md bg-teal-400 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-teal-300" type="button" on:click={onUploadSource} use:tooltip={'Upload a new source scan through the staged importer'}>
            <Upload size={16} /> Upload
          </button>
        </div>
        <label class="relative block">
          <Search class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input class="w-full rounded-md border border-neutral-700 bg-neutral-950 py-2 pl-9 pr-3 text-sm" placeholder="Quicksearch source scans" bind:value={query} />
        </label>
        <div class="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1">
          <button class="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-teal-500/70 bg-neutral-950 p-3 text-center text-teal-200 hover:bg-neutral-800" type="button" on:click={onUploadSource} use:tooltip={'Import new source scans for cropping'}>
            <Upload size={22} />
            <span class="mt-2 text-xs font-semibold">Upload source</span>
          </button>
          {#each filteredAssets as asset (asset.id)}
            <button
              class={`overflow-hidden rounded-md border text-left transition ${asset.id === sourceAssetId ? 'border-teal-400 bg-neutral-950' : 'border-neutral-800 bg-neutral-950 hover:border-neutral-600'}`}
              type="button"
              on:click={() => {
                sourceAssetId = asset.id;
                status = '';
              }}
            >
              <div class="aspect-[4/3] bg-neutral-900">
                <img class="h-full w-full object-contain" src={asset.image} alt={asset.name} />
              </div>
              <div class="p-2">
                <p class="truncate text-xs font-semibold text-neutral-100">{asset.name}</p>
                <p class="mt-1 text-[11px] text-neutral-500">{asset.role === 'binder' ? 'Page' : 'Item'} · {asset.side}</p>
              </div>
            </button>
          {/each}
          {#if filteredAssets.length === 0}
            <div class="col-span-2 rounded-md border border-neutral-800 bg-neutral-950 p-4 text-center text-sm text-neutral-500">
              No source scans match.
            </div>
          {/if}
        </div>
        <div class="flex rounded-md border border-neutral-700 bg-neutral-950 p-1">
          <button class={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${side === 'front' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => (side = 'front')}>Front</button>
          <button class={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${side === 'back' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => (side = 'back')}>Back</button>
        </div>
        <p class="rounded-md bg-neutral-950 p-3 text-xs text-neutral-500">{status || 'Draw a rectangle on the scan. Releasing the mouse saves and assigns the crop.'}</p>
      </aside>
    </div>
  </div>
</div>
