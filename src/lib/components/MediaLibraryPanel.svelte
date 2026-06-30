<script lang="ts">
  import { ChevronDown, ChevronUp, Search, Trash2, Upload } from '@lucide/svelte';
  import { tooltip } from '../actions/tooltip';
  import { scanOptionLabel } from '../domain/scans';
  import { binderStore } from '../state/binderStore';
  import type { ScanAsset, ScanRole } from '../types';

  export let assets: ScanAsset[] = [];
  export let onUpload: () => void = () => {};

  let open = true;
  let filter: 'all' | ScanRole = 'all';
  let query = '';

  $: filtered = assets.filter((asset) => {
    const roleMatch = filter === 'all' || asset.role === filter;
    const search = query.trim().toLowerCase();
    return roleMatch && (!search || `${asset.name} ${asset.source} ${scanOptionLabel(asset)}`.toLowerCase().includes(search));
  });
</script>

<section class="rounded-md border border-neutral-800 bg-neutral-900">
  <header class="flex min-h-10 flex-wrap items-stretch justify-between gap-x-2 gap-y-0 px-3">
    <button class="inline-flex min-h-10 items-center gap-1.5 py-0 text-left" type="button" on:click={() => (open = !open)} use:tooltip={open ? 'Collapse the media library tray' : 'Open the media library tray'}>
      {#if open}
        <ChevronUp size={16} class="text-teal-300" />
      {:else}
        <ChevronDown size={16} class="text-teal-300" />
      {/if}
      <span class="flex items-baseline gap-2">
        <span class="text-sm font-semibold text-neutral-50">Media library</span>
        <span class="text-[11px] text-neutral-400">{assets.length} imported media asset{assets.length === 1 ? '' : 's'}</span>
      </span>
    </button>

    <div class="flex min-h-10 flex-wrap items-stretch gap-1.5">
      <div class="flex min-h-10 rounded-md border border-neutral-700 bg-neutral-950 p-0.5">
        <button class={`rounded px-2 py-0.5 text-[11px] font-medium ${filter === 'all' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => (filter = 'all')} use:tooltip={'Show all imported media'}>All</button>
        <button class={`rounded px-2 py-0.5 text-[11px] font-medium ${filter === 'binder' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => (filter = 'binder')} use:tooltip={'Show only binder page scans'}>Pages</button>
        <button class={`rounded px-2 py-0.5 text-[11px] font-medium ${filter === 'item' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => (filter = 'item')} use:tooltip={'Show only item scans and crops'}>Items</button>
      </div>
      <button class="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-teal-400 px-2.5 py-0 text-xs font-semibold text-neutral-950 hover:bg-teal-300" type="button" on:click={onUpload} use:tooltip={'Import PDFs, images, or ZIPs in bulk'}>
        <Upload size={14} /> Import media
      </button>
    </div>
  </header>

  {#if open}
    <div class="border-t border-neutral-800 p-3 sm:p-4">
      <label class="relative block max-w-md">
        <Search class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
        <input class="w-full rounded-md border border-neutral-700 bg-neutral-950 py-2 pl-9 pr-3 text-sm" placeholder="Quicksearch media by filename" bind:value={query} />
      </label>

      <div class="mt-4 overflow-x-auto pb-3">
        <div class="grid auto-cols-[12rem] grid-flow-col grid-rows-2 gap-3">
          <button class="flex min-h-44 flex-col items-center justify-center rounded-md border border-dashed border-teal-500/70 bg-neutral-950 p-4 text-center text-teal-200 hover:bg-neutral-800" type="button" on:click={onUpload} use:tooltip={'Bulk import new scans into the review queue'}>
            <Upload size={28} />
            <span class="mt-3 text-sm font-semibold">Import new media</span>
            <span class="mt-1 text-xs text-neutral-500">PDF, image, or ZIP</span>
          </button>

          {#if filtered.length === 0}
            <div class="flex min-h-44 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 p-4 text-center text-sm text-neutral-500">
              No media matches this view.
            </div>
          {/if}

          {#each filtered as asset (asset.id)}
            <article class="group overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
              <div class="relative aspect-[4/3] bg-neutral-900">
                <img class="h-full w-full object-contain" src={asset.image} alt={asset.name} />
                <button class="absolute right-2 top-2 rounded-md border border-red-900/70 bg-neutral-950/85 p-1.5 text-red-300 opacity-0 shadow transition hover:bg-red-950 group-hover:opacity-100 focus:opacity-100" type="button" aria-label="Delete media" on:click={() => binderStore.removeAsset(asset.id)} use:tooltip={'Delete this media asset everywhere it is used'}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div class="p-2">
                <h3 class="truncate text-sm font-semibold text-neutral-100">{asset.name}</h3>
                <p class="mt-1 truncate text-xs text-neutral-500">{asset.source}</p>
                <p class="mt-2 text-xs text-neutral-400">{asset.role === 'binder' ? 'Page' : 'Item'} · {asset.side}</p>
              </div>
            </article>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</section>
