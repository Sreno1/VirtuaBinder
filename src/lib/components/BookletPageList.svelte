<script lang="ts">
  import { ArrowDown, ArrowUp, BookOpen, GripVertical, Plus, Trash2 } from '@lucide/svelte';
  import { displayItemTitle } from '../domain/items';
  import { binderStore } from '../state/binderStore';
  import type { BinderItem, BinderPage } from '../types';

  export let pages: BinderPage[] = [];
  export let items: BinderItem[] = [];
  export let activePageId = '';
  export let selectedItemId = '';

  $: looseItems = items
    .filter((item) => item.kind === 'loose')
    .sort((a, b) => (a.insertIndex ?? pages.length) - (b.insertIndex ?? pages.length) || (a.looseOrder ?? 0) - (b.looseOrder ?? 0));

  function looseItemsForGap(gapIndex: number) {
    return looseItems.filter((item) => (item.insertIndex ?? pages.length) === gapIndex);
  }
</script>

<div class="flex items-center justify-between gap-3">
  <h2 class="text-lg font-semibold text-neutral-50">Pages</h2>
  <button class="inline-flex items-center gap-2 rounded-md bg-teal-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-teal-400" type="button" on:click={() => binderStore.addBinderPage()}>
    <Plus size={16} /> Page
  </button>
</div>

{#if pages.length === 0 && looseItems.length === 0}
  <div class="mt-4 rounded-md bg-neutral-950 p-4 text-sm text-neutral-400">
    <p>Add booklet pages after importing binder scans, or insert a standalone item.</p>
    <button class="mt-3 inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800" type="button" on:click={() => binderStore.addLooseItem(0)}>
      <Plus size={16} /> Item here
    </button>
  </div>
{:else}
  <div class="mt-4 space-y-2">
    {#each Array(pages.length + 1) as _, gapIndex}
      <div class="flex items-center gap-2 py-1">
        <div class="h-px flex-1 bg-neutral-800"></div>
        <button
          class="inline-flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
          type="button"
          on:click={() => binderStore.addLooseItem(gapIndex)}
        >
          <Plus size={13} /> Item here
        </button>
        <div class="h-px flex-1 bg-neutral-800"></div>
      </div>

      {#each looseItemsForGap(gapIndex) as item (item.id)}
        <article class={`rounded-md border bg-neutral-950 p-2 ${item.id === selectedItemId ? 'border-amber-300' : 'border-neutral-800'}`}>
          <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <div class="rounded-md border border-neutral-700 p-2 text-amber-300">
              <BookOpen size={16} />
            </div>
            <button class="min-w-0 px-1 py-2 text-left" type="button" on:click={() => binderStore.setActiveLooseItem(item.id)}>
              <span class="block truncate text-sm font-semibold text-neutral-100">{displayItemTitle(item)}</span>
              <span class="text-xs text-neutral-500">Inserted item</span>
            </button>
            <button class="rounded-md border border-red-900/70 p-1.5 text-red-300 hover:bg-red-950" type="button" aria-label="Delete item" on:click={() => binderStore.removeItem(item.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        </article>
      {/each}

      {#if gapIndex < pages.length}
        {@const page = pages[gapIndex]}
        <article class={`rounded-md border bg-neutral-950 p-2 ${page.id === activePageId ? 'border-teal-400' : 'border-neutral-800'}`}>
        <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            class="rounded-md border border-neutral-700 p-2 text-neutral-300 hover:bg-neutral-800"
            type="button"
            aria-label={`Page ${gapIndex + 1}`}
          >
            <GripVertical size={16} />
          </button>
          <button class="min-w-0 px-1 py-2 text-left" type="button" on:click={() => binderStore.setActiveBookletPage(page.id)}>
            <span class="block truncate text-sm font-semibold text-neutral-100">{page.title}</span>
            <span class="text-xs text-neutral-500">Page {gapIndex + 1}</span>
          </button>
          <div class="flex items-center gap-1">
            <button class="rounded-md border border-neutral-700 p-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-35" type="button" aria-label="Move page up" disabled={gapIndex === 0} on:click={() => binderStore.moveBinderPage(page.id, -1)}>
              <ArrowUp size={14} />
            </button>
            <button class="rounded-md border border-neutral-700 p-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-35" type="button" aria-label="Move page down" disabled={gapIndex === pages.length - 1} on:click={() => binderStore.moveBinderPage(page.id, 1)}>
              <ArrowDown size={14} />
            </button>
            <button class="rounded-md border border-red-900/70 p-1.5 text-red-300 hover:bg-red-950" type="button" aria-label="Delete page" on:click={() => binderStore.removeBinderPage(page.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        </article>
      {/if}
    {/each}
  </div>
{/if}
