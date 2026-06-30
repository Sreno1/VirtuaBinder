<script lang="ts">
  import { FlipHorizontal, Pencil, X } from '@lucide/svelte';
  import LocationInput from './LocationInput.svelte';
  import TicketFallback from './TicketFallback.svelte';
  import { displayItemDate, displayItemLocation, displayItemNotes, displayItemPeople, displayItemTitle } from '../domain/items';
  import { locationForItem } from '../domain/locations';
  import { binderStore } from '../state/binderStore';

  const FLIP_GESTURE_DISTANCE = 28;
  let gestureStart: { x: number; y: number; pointerId: number } | null = null;

  $: project = $binderStore.project;
  $: ui = $binderStore.ui;
  $: item = project.items.find((candidate) => candidate.id === ui.shadowItemId);
  $: front = project.assets.find((asset) => asset.id === item?.frontScanId);
  $: back = project.assets.find((asset) => asset.id === item?.backScanId);
  $: hasNotes = Boolean(item?.notes.trim());
  $: binderStore.syncLocationInput(item, 'shadow');

  function beginFlipGesture(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    gestureStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function endFlipGesture(event: PointerEvent) {
    if (!gestureStart || gestureStart.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - gestureStart.x, event.clientY - gestureStart.y);
    clearFlipGesture(event);
    if (distance >= FLIP_GESTURE_DISTANCE) {
      binderStore.setShadowFlipped(!ui.shadowFlipped);
    }
  }

  function clearFlipGesture(event?: PointerEvent) {
    if (!gestureStart) return;
    const target = event?.currentTarget;
    if (target instanceof HTMLElement && target.hasPointerCapture(gestureStart.pointerId)) {
      target.releasePointerCapture(gestureStart.pointerId);
    }
    gestureStart = null;
  }

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      binderStore.closeShadowbox();
    }
  }

  function handleFlipKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      binderStore.setShadowFlipped(!ui.shadowFlipped);
    }
  }
</script>

{#if item}
  <div class="fixed inset-0 z-50 overflow-auto" role="dialog" aria-modal="true" tabindex="0" on:keydown={handleDialogKeydown}>
    <button class="fixed inset-0 bg-black/95" type="button" aria-label="Close item viewer" on:click={() => binderStore.closeShadowbox()}></button>
    <div class="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 pointer-events-none">
      <div class="flex w-full max-w-6xl flex-col items-center gap-5 pointer-events-auto">
        <div
          class="flip-card h-[min(72vh,760px)] min-h-[320px] w-full cursor-grab select-none active:cursor-grabbing"
          role="button"
          tabindex="0"
          aria-label="Flip item by dragging, swiping, or pressing Enter"
          style="touch-action: none;"
          on:pointerdown={beginFlipGesture}
          on:pointerup={endFlipGesture}
          on:pointercancel={clearFlipGesture}
          on:lostpointercapture={clearFlipGesture}
          on:keydown={handleFlipKeydown}
        >
        <div class={`flip-card-inner relative h-full w-full ${ui.shadowFlipped ? 'is-flipped' : ''}`}>
          <div class="flip-card-face absolute inset-0 flex items-center justify-center">
            {#if front}
              <img class="max-h-full max-w-full rounded object-contain shadow-2xl" src={front.image} alt={`${displayItemTitle(item)} front`} draggable="false" />
            {:else}
              <TicketFallback {item} side="front" />
            {/if}
          </div>
          <div class="flip-card-face flip-card-back absolute inset-0 flex items-center justify-center">
            {#if back}
              <img class="max-h-full max-w-full rounded object-contain shadow-2xl" src={back.image} alt={`${displayItemTitle(item)} back`} draggable="false" />
            {:else}
              <TicketFallback {item} side="back" />
            {/if}
          </div>
        </div>
        </div>

        <div class="flex items-center gap-2">
          <button class="rounded-full border border-neutral-700 bg-neutral-950/75 p-3 text-neutral-100 shadow-lg backdrop-blur hover:bg-neutral-800" type="button" aria-label="Flip item" title="Flip" on:click={() => binderStore.setShadowFlipped(!ui.shadowFlipped)}>
            <FlipHorizontal size={18} />
          </button>
          <button
            class={`rounded-full border p-3 shadow-lg backdrop-blur ${ui.shadowEditing ? 'border-teal-400 bg-teal-400 text-neutral-950 hover:bg-teal-300' : 'border-neutral-700 bg-neutral-950/75 text-neutral-100 hover:bg-neutral-800'}`}
            type="button"
            aria-label="Edit item details"
            title="Edit"
            on:click={() => binderStore.setShadowEditing(!ui.shadowEditing)}
          >
            <Pencil size={18} />
          </button>
        </div>

        {#if !ui.shadowEditing}
          <section class="max-w-3xl text-center text-neutral-100 drop-shadow-2xl">
            <h2 class="text-2xl font-semibold">{displayItemTitle(item)}</h2>
            <p class="mt-2 text-sm uppercase tracking-[0.18em] text-teal-300">{displayItemDate(item)}</p>
            {#if locationForItem(item)}
              <p class="mt-2 text-sm text-amber-200">{displayItemLocation(item)}</p>
            {/if}
            <p class="mt-3 text-sm text-neutral-300">{displayItemPeople(item)}</p>
            {#if hasNotes}
              <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-200">{displayItemNotes(item)}</p>
            {/if}
          </section>
        {/if}

        {#if ui.shadowEditing}
          <section class="fixed bottom-4 left-4 right-4 z-20 mx-auto max-w-3xl rounded-md border border-neutral-800 bg-neutral-950/90 p-4 text-neutral-100 shadow-2xl backdrop-blur md:left-auto md:right-4 md:mx-0 md:max-w-sm">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">Edit item</h2>
              <button class="rounded-md border border-neutral-700 p-2 hover:bg-neutral-800" type="button" aria-label="Close editor" on:click={() => binderStore.setShadowEditing(false)}>
                <X size={16} />
              </button>
            </div>
            <div class="mt-4 grid gap-3">
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Title</span>
                <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={item.title} on:input={(event) => binderStore.updateItem(item.id, { title: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Date</span>
                <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" type="date" value={item.date} on:input={(event) => binderStore.updateItem(item.id, { date: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Other people</span>
                <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={item.people} on:input={(event) => binderStore.updateItem(item.id, { people: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Location</span>
                <LocationInput item={item} context="shadow" search={ui.shadowLocationSearch} focused={ui.shadowLocationFocused} />
              </label>
              <label class="block">
                <span class="text-xs font-medium text-neutral-400">Notes</span>
                <textarea class="mt-1 min-h-24 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" value={item.notes} on:input={(event) => binderStore.updateItem(item.id, { notes: (event.currentTarget as HTMLTextAreaElement).value })}></textarea>
              </label>
            </div>
          </section>
        {/if}
      </div>
    </div>
  </div>
{/if}
