<script lang="ts">
  import type { BinderItem } from '../types';
  import { displayItemDate, displayItemLocation, displayItemNotes, displayItemPeople, displayItemTitle } from '../domain/items';

  export let item: BinderItem;
  export let side: 'front' | 'back' = 'front';

  $: hasNotes = Boolean(item.notes.trim());
</script>

{#if side === 'front'}
  <div class="relative flex aspect-[5/2] w-full max-w-3xl overflow-hidden rounded-md border border-amber-500/70 bg-amber-100 text-neutral-950 shadow-2xl">
    <div class="flex flex-1 flex-col justify-between p-6 sm:p-8">
      <div class="flex items-center justify-between gap-4 border-b border-dashed border-neutral-700/50 pb-4">
        <span class="text-xs font-bold uppercase tracking-[0.28em] text-teal-800">Admit One</span>
        <span class="rounded border border-neutral-800 px-2 py-1 text-xs font-semibold uppercase">{displayItemDate(item)}</span>
      </div>
      <div class="py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-600">Timeline Binder</p>
        <h3 class="mt-2 break-words text-3xl font-black leading-tight sm:text-5xl">{displayItemTitle(item)}</h3>
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
{:else}
  <div class="relative flex aspect-[5/2] w-full max-w-3xl overflow-hidden rounded-md border border-teal-500/70 bg-neutral-100 text-neutral-950 shadow-2xl">
    <div class="flex w-24 flex-col items-center justify-center border-r border-dashed border-neutral-700/60 bg-teal-200 px-3 text-center sm:w-32">
      <span class="rotate-90 whitespace-nowrap text-sm font-black uppercase tracking-[0.28em] text-neutral-700">Details</span>
    </div>
    <div class="grid flex-1 gap-4 p-6 sm:grid-cols-2 sm:p-8">
      <div class="sm:col-span-2">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-teal-800">Back of Ticket</p>
        <h3 class="mt-2 break-words text-2xl font-black leading-tight sm:text-4xl">{displayItemTitle(item)}</h3>
      </div>
      <div class="rounded border border-dashed border-neutral-500/70 p-3">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Date</p>
        <p class="mt-2 text-lg font-semibold">{displayItemDate(item)}</p>
      </div>
      <div class="rounded border border-dashed border-neutral-500/70 p-3">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Location</p>
        <p class="mt-2 text-sm font-semibold">{displayItemLocation(item)}</p>
      </div>
      <div class="rounded border border-dashed border-neutral-500/70 p-3">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Other People</p>
        <p class="mt-2 whitespace-pre-wrap text-sm font-medium">{displayItemPeople(item)}</p>
      </div>
      {#if hasNotes}
        <div class="rounded border border-dashed border-neutral-500/70 p-3 sm:col-span-2">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Notes</p>
          <p class="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-sm font-medium">{displayItemNotes(item)}</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
