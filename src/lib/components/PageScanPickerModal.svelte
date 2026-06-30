<script lang="ts">
  import { Search, X } from '@lucide/svelte';
  import { scanOptionLabel } from '../domain/scans';
  import type { ScanAsset } from '../types';

  export let assets: ScanAsset[] = [];
  export let side: 'front' | 'back' = 'front';
  export let pageTitle = 'page';
  export let onClose: () => void = () => {};
  export let onSelect: (assetId: string) => void = () => {};

  let query = '';

  $: normalized = query.trim().toLowerCase();
  $: filtered = assets.filter((asset) => {
    if (!normalized) return true;
    return `${asset.name} ${asset.source} ${scanOptionLabel(asset)}`.toLowerCase().includes(normalized);
  });

  function selectAsset(assetId: string) {
    onSelect(assetId);
    onClose();
  }
</script>

<div class="fixed inset-0 z-50 overflow-auto bg-black/90 p-4" role="dialog" aria-modal="true">
  <div class="mx-auto flex max-h-[calc(100vh-2rem)] max-w-6xl flex-col rounded-md border border-neutral-800 bg-neutral-950 shadow-2xl">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 p-4">
      <div>
        <h2 class="text-lg font-semibold text-neutral-50">Select {side} page scan</h2>
        <p class="text-sm text-neutral-400">Choose an existing page scan for {pageTitle}.</p>
      </div>
      <button class="rounded-md border border-neutral-700 p-2 text-neutral-200 hover:bg-neutral-800" type="button" aria-label="Close media picker" on:click={onClose}>
        <X size={18} />
      </button>
    </header>

    <div class="border-b border-neutral-800 p-4">
      <label class="relative block">
        <Search class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
        <input class="w-full rounded-md border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-3 text-sm" placeholder="Quicksearch by filename or source" bind:value={query} />
      </label>
    </div>

    <div class="overflow-auto p-4">
      {#if filtered.length === 0}
        <div class="rounded-md border border-dashed border-neutral-700 p-8 text-center text-sm text-neutral-400">
          No page scans match this search.
        </div>
      {:else}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {#each filtered as asset (asset.id)}
            <button class="group overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 text-left transition hover:border-teal-400" type="button" on:click={() => selectAsset(asset.id)}>
              <div class="aspect-[3/4] bg-neutral-950">
                <img class="h-full w-full object-contain transition group-hover:scale-[1.02]" src={asset.image} alt={asset.name} />
              </div>
              <div class="p-3">
                <h3 class="truncate text-sm font-semibold text-neutral-100">{asset.name}</h3>
                <p class="mt-1 truncate text-xs text-neutral-500">{asset.source}</p>
                <p class="mt-2 text-xs uppercase tracking-wide text-teal-300">{asset.side}</p>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
