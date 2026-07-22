<script lang="ts">
  import { ChevronLeft, ChevronRight, Eye } from '@lucide/svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import { buildPreviewSides, buildPreviewSpreads } from '../domain/preview';
  import { previewSlotPositionStyle } from '../domain/geometry';
  import { displayItemTitle } from '../domain/items';
  import { itemForSlot } from '../domain/project';
  import { binderStore } from '../state/binderStore';
  import type { PreviewSide } from '../types';

  $: project = $binderStore.project;
  $: ui = $binderStore.ui;
  $: sides = buildPreviewSides(project.pages, project.items, project.assets);
  $: spreads = buildPreviewSpreads(sides);
  $: doubleSpread = spreads[ui.previewIndex] ?? [];
  $: singleSide = sides[ui.previewIndex];

  function pageTitle(side?: PreviewSide | null) {
    if (!side) return '';
    return side.kind === 'loose' && side.item ? `${displayItemTitle(side.item)} ${side.side}` : `${side.page?.title ?? 'Page'} ${side.side}`;
  }
</script>

{#snippet previewSurface(side: PreviewSide)}
  {#if side.asset}
    <div class="relative inline-block max-h-[78vh] max-w-full">
      <img class="block max-h-[78vh] max-w-full object-contain" src={side.asset.image} alt={pageTitle(side)} />
      {#if side.kind === 'page' && side.page}
        {@const template = project.templates.find((candidate) => candidate.id === side.page?.templateId)}
        {#if template}
          {#each template.slots as slot (slot.id)}
            {@const item = itemForSlot(project.items, side.page.id, slot.id)}
            <button
              class={`absolute border-2 bg-transparent ${ui.previewBorders ? 'border-teal-300 hover:border-amber-300' : 'border-transparent hover:border-amber-300'}`}
              style={previewSlotPositionStyle(slot, side.side === 'back')}
              type="button"
              title={item ? displayItemTitle(item) : `Slot ${slot.label}`}
              on:click={() => side.page && binderStore.openPreviewSlot(side.page, slot, side.side)}
            ></button>
          {/each}
        {/if}
      {:else if side.kind === 'loose' && side.item}
        <button
          class="absolute inset-0 cursor-zoom-in"
          type="button"
          aria-label={`Open ${pageTitle(side)}`}
          on:click={() => side.item && binderStore.openItemShadowbox(side.item.id, side.side)}
        ></button>
      {/if}
    </div>
  {:else}
    <div class="px-6 text-center text-sm text-neutral-500">
      {#if side.kind === 'loose' && side.item}
        No {side.side} image assigned for {displayItemTitle(side.item)}.
      {:else}
        No {side.side} scan assigned for {side.page?.title ?? 'this page'}.
      {/if}
    </div>
  {/if}
{/snippet}

<section class="bg-black px-4 py-6 sm:px-6">
  <div class="mx-auto max-w-7xl">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-950 p-3">
      <div class="flex items-center gap-2 text-neutral-100">
        <Eye size={18} />
        <h2 class="text-lg font-semibold">Preview</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-md border border-neutral-700 bg-neutral-950 p-1">
          <button class={`rounded px-3 py-1.5 text-sm font-medium ${ui.previewMode === 'single' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => binderStore.setPreviewMode('single')}>Single</button>
          <button class={`rounded px-3 py-1.5 text-sm font-medium ${ui.previewMode === 'double' ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => binderStore.setPreviewMode('double')}>Double</button>
        </div>
        <button class={`rounded-md border px-3 py-2 text-sm font-medium ${ui.previewBorders ? 'border-teal-400 bg-teal-400 text-neutral-950' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'}`} type="button" on:click={() => binderStore.setPreviewBorders(!ui.previewBorders)}>
          Borders
        </button>
        <button class="rounded-md border border-neutral-700 p-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-35" type="button" aria-label="Previous spread" disabled={ui.previewIndex <= 0} on:click={() => binderStore.movePreview(-1)}>
          <ChevronLeft size={18} />
        </button>
        <button
          class="rounded-md border border-neutral-700 p-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-35"
          type="button"
          aria-label="Next spread"
          disabled={ui.previewMode === 'double' ? ui.previewIndex >= spreads.length - 1 : ui.previewIndex >= sides.length - 1}
          on:click={() => binderStore.movePreview(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>

    {#if sides.length === 0}
      <EmptyState text="The booklet does not have pages yet. Add booklet pages in the editor to preview them here." />
    {:else if ui.previewMode === 'double'}
      <div class="grid min-h-[72vh] gap-4 rounded-md bg-neutral-950 p-4 shadow-2xl md:grid-cols-2">
        {#each doubleSpread as side, index (`${ui.previewIndex}-${index}`)}
          <div class={`relative flex min-h-[420px] items-center justify-center overflow-hidden rounded bg-neutral-900 ${index === 0 ? 'md:shadow-[inset_-18px_0_28px_rgba(0,0,0,0.45)]' : 'md:shadow-[inset_18px_0_28px_rgba(0,0,0,0.45)]'}`}>
            {#if side}
              {@render previewSurface(side)}
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex min-h-[72vh] items-center justify-center rounded-md bg-neutral-950 p-4 shadow-2xl">
        <div class="relative flex min-h-[420px] w-full max-w-4xl items-center justify-center overflow-hidden rounded bg-neutral-900">
          {#if singleSide}
            {@render previewSurface(singleSide)}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>
