<script lang="ts">
  import { Check, Crop, FileArchive, Upload, X } from '@lucide/svelte';
  import { cropScanAsset } from '../domain/crops';
  import { clamp, round } from '../domain/id';
  import { stageImportFiles } from '../services/importScans';
  import type { DrawRect, ScanRole, ScanSide, StagedImportCandidate } from '../types';

  export let initialRole: ScanRole = 'binder';
  export let initialSide: ScanSide = 'unspecified';
  export let title = 'Import media';
  export let onClose: () => void = () => {};
  export let onCommit: (candidates: StagedImportCandidate[]) => void = () => {};

  let candidates: StagedImportCandidate[] = [];
  let selectedId = '';
  let status = '';
  let busy = false;
  let cropSide: 'front' | 'back' = 'front';
  let cropCanvas: HTMLDivElement;
  let drawing: DrawRect | null = null;

  $: selected = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
  $: if (!selectedId && candidates[0]) selectedId = candidates[0].id;

  async function handleFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    busy = true;
    status = `Preparing ${files.length} file${files.length === 1 ? '' : 's'}...`;
    try {
      const staged = await stageImportFiles(files, (message) => (status = message), {
        role: initialRole,
        side: initialSide
      });
      candidates = [...candidates, ...staged];
      selectedId = staged[0]?.id ?? selectedId;
      status = staged.length
        ? `Prepared ${staged.length} scan${staged.length === 1 ? '' : 's'} for review.`
        : 'No supported PDFs or images were found.';
    } catch (error) {
      status = error instanceof Error ? error.message : 'Import preparation failed.';
    } finally {
      busy = false;
    }
  }

  function updateCandidate(id: string, patch: Partial<StagedImportCandidate>) {
    candidates = candidates.map((candidate) => (candidate.id === id ? { ...candidate, ...patch } : candidate));
  }

  function markAll(role: ScanRole) {
    candidates = candidates.map((candidate) => ({ ...candidate, role }));
  }

  function alternateSides() {
    candidates = candidates.map((candidate, index) => ({
      ...candidate,
      side: index % 2 === 0 ? 'front' : 'back'
    }));
  }

  function clearSides() {
    candidates = candidates.map((candidate) => ({ ...candidate, side: 'unspecified' }));
  }

  function pointerPercent(event: MouseEvent) {
    const rect = cropCanvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
    };
  }

  function startDraw(event: MouseEvent) {
    if (!selected || selected.role !== 'item') return;
    const point = pointerPercent(event);
    drawing = { startX: point.x, startY: point.y, x: point.x, y: point.y, w: 0, h: 0 };
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
    if (!drawing || !selected || selected.role !== 'item') return;
    const rect = drawing;
    drawing = null;
    if (rect.w <= 2 || rect.h <= 2) return;
    busy = true;
    status = `Cropping ${cropSide}...`;
    try {
      const cropped = await cropScanAsset({ image: selected.image, width: selected.width, height: selected.height }, rect);
      const previous = cropSide === 'front' ? selected.frontCrop : selected.backCrop;
      if (previous) URL.revokeObjectURL(previous.image);
      updateCandidate(selected.id, {
        [cropSide === 'front' ? 'frontCrop' : 'backCrop']: {
          image: URL.createObjectURL(cropped.blob),
          width: cropped.width,
          height: cropped.height,
          blob: cropped.blob
        }
      });
      status = `Saved ${cropSide} crop for ${selected.name || selected.source}.`;
    } catch (error) {
      status = error instanceof Error ? error.message : 'Crop failed.';
    } finally {
      busy = false;
    }
  }

  function revokeCandidateUrls(candidate: StagedImportCandidate) {
    URL.revokeObjectURL(candidate.image);
    if (candidate.frontCrop) URL.revokeObjectURL(candidate.frontCrop.image);
    if (candidate.backCrop) URL.revokeObjectURL(candidate.backCrop.image);
  }

  function handleClose() {
    candidates.forEach(revokeCandidateUrls);
    onClose();
  }

  function commit() {
    if (!candidates.length) return;
    onCommit(candidates);
    handleClose();
  }
</script>

<svelte:window on:mousemove={moveDraw} on:mouseup={finishDraw} />

<div class="fixed inset-0 z-50 overflow-auto bg-black/90 p-4" role="dialog" aria-modal="true">
  <div class="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col rounded-md border border-neutral-800 bg-neutral-950 shadow-2xl">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-md bg-teal-400 text-neutral-950">
          <FileArchive size={20} />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-neutral-50">{title}</h2>
          <p class="text-sm text-neutral-400">Review each temporary scan before it is saved to the media library.</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="inline-flex cursor-pointer items-center gap-2 rounded-md bg-teal-400 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-teal-300">
          <Upload size={16} /> Select files
          <input class="sr-only" type="file" accept=".pdf,.zip,image/jpeg,image/png,image/webp" multiple on:change={handleFiles} />
        </label>
        <button class="rounded-md border border-neutral-700 p-2 text-neutral-200 hover:bg-neutral-800" type="button" aria-label="Close importer" on:click={handleClose}>
          <X size={18} />
        </button>
      </div>
    </header>

    <div class="grid flex-1 gap-4 p-4 lg:grid-cols-[320px_1fr]">
      <aside class="space-y-4">
        <div class="rounded-md border border-neutral-800 bg-neutral-900 p-3">
          <div class="flex flex-wrap gap-2">
            <button class="rounded-md border border-neutral-700 px-2 py-1.5 text-xs font-medium hover:bg-neutral-800" type="button" on:click={() => markAll('binder')}>All pages</button>
            <button class="rounded-md border border-neutral-700 px-2 py-1.5 text-xs font-medium hover:bg-neutral-800" type="button" on:click={() => markAll('item')}>All items</button>
            <button class="rounded-md border border-neutral-700 px-2 py-1.5 text-xs font-medium hover:bg-neutral-800" type="button" on:click={alternateSides}>Alternate sides</button>
            <button class="rounded-md border border-neutral-700 px-2 py-1.5 text-xs font-medium hover:bg-neutral-800" type="button" on:click={clearSides}>Clear sides</button>
          </div>
          <p class="mt-3 text-xs text-neutral-500">{status || 'Choose PDFs, images, or ZIPs to begin.'}</p>
        </div>

        <div class="max-h-[66vh] space-y-2 overflow-auto pr-1">
          {#if candidates.length === 0}
            <div class="rounded-md border border-dashed border-neutral-700 p-5 text-sm text-neutral-400">
              Selected files will appear here as temporary review cards.
            </div>
          {/if}
          {#each candidates as candidate (candidate.id)}
            <button
              class={`grid w-full grid-cols-[56px_1fr] gap-3 rounded-md border p-2 text-left ${candidate.id === selected?.id ? 'border-teal-400 bg-neutral-900' : 'border-neutral-800 bg-neutral-950 hover:bg-neutral-900'}`}
              type="button"
              on:click={() => (selectedId = candidate.id)}
            >
              <img class="h-16 w-14 rounded object-cover" src={candidate.image} alt={candidate.name} />
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold text-neutral-100">{candidate.name || candidate.source}</span>
                <span class="mt-1 block text-xs text-neutral-500">{candidate.role === 'binder' ? 'Page' : 'Item'} · {candidate.side}</span>
                {#if candidate.frontCrop || candidate.backCrop}
                  <span class="mt-1 block text-xs text-amber-300">Crop saved</span>
                {/if}
              </span>
            </button>
          {/each}
        </div>
      </aside>

      <section class="min-h-[560px] rounded-md border border-neutral-800 bg-neutral-900 p-4">
        {#if !selected}
          <div class="flex h-full items-center justify-center text-sm text-neutral-500">Select files to review scans.</div>
        {:else}
          <div class="grid gap-4 xl:grid-cols-[1fr_280px]">
            <div class="overflow-auto rounded-md bg-neutral-950 p-3">
              <div
                bind:this={cropCanvas}
                class="relative mx-auto w-fit cursor-crosshair select-none overflow-hidden rounded bg-neutral-900"
                role="button"
                tabindex="0"
                aria-label="Draw crop rectangle"
                on:mousedown={startDraw}
              >
                <img class="block max-h-[72vh] max-w-full" src={selected.image} alt={selected.name} draggable="false" />
                {#if drawing}
                  <div class="absolute border-2 border-amber-400 bg-amber-300/20" style={`left:${drawing.x}%;top:${drawing.y}%;width:${drawing.w}%;height:${drawing.h}%;`}></div>
                {/if}
              </div>
            </div>

            <div class="space-y-3">
              <label class="block">
                <span class="text-sm font-medium text-neutral-400">Name</span>
                <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" value={selected.name} on:input={(event) => updateCandidate(selected.id, { name: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-neutral-400">Type</span>
                <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" value={selected.role} on:change={(event) => updateCandidate(selected.id, { role: (event.currentTarget as HTMLSelectElement).value as ScanRole })}>
                  <option value="binder">Page scan</option>
                  <option value="item">Item scan</option>
                </select>
              </label>
              <label class="block">
                <span class="text-sm font-medium text-neutral-400">Side</span>
                <select class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" value={selected.side} on:change={(event) => updateCandidate(selected.id, { side: (event.currentTarget as HTMLSelectElement).value as ScanSide })}>
                  <option value="unspecified">No side</option>
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                </select>
              </label>

              {#if selected.role === 'item'}
                <div class="rounded-md border border-neutral-800 bg-neutral-950 p-3">
                  <div class="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                    <Crop size={16} /> Item crop
                  </div>
                  <div class="mt-3 flex rounded-md border border-neutral-700 bg-neutral-900 p-1">
                    <button class={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${cropSide === 'front' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => (cropSide = 'front')}>Front</button>
                    <button class={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${cropSide === 'back' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => (cropSide = 'back')}>Back</button>
                  </div>
                  <p class="mt-3 text-xs text-neutral-500">Draw on the large scan to save the selected side crop.</p>
                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <div class="rounded-md bg-neutral-900 p-2 text-xs text-neutral-400">{selected.frontCrop ? 'Front crop ready' : 'No front crop'}</div>
                    <div class="rounded-md bg-neutral-900 p-2 text-xs text-neutral-400">{selected.backCrop ? 'Back crop ready' : 'No back crop'}</div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </section>
    </div>

    <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 p-4">
      <p class="text-sm text-neutral-400">{candidates.length} temporary scan{candidates.length === 1 ? '' : 's'} ready.</p>
      <div class="flex gap-2">
        <button class="rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800" type="button" on:click={handleClose}>Cancel</button>
        <button class="inline-flex items-center gap-2 rounded-md bg-teal-400 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-teal-300 disabled:opacity-40" type="button" disabled={!candidates.length || busy} on:click={commit}>
          <Check size={16} /> Add to media library
        </button>
      </div>
    </footer>
  </div>
</div>
