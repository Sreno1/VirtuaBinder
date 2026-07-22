<script lang="ts">
  import { ChevronLeft, ChevronRight, FlipHorizontal, Pencil, X } from '@lucide/svelte';
  import LocationInput from './LocationInput.svelte';
  import TicketFallback from './TicketFallback.svelte';
  import { displayItemDate, displayItemLocation, displayItemNotes, displayItemPeople, displayItemTitle } from '../domain/items';
  import { locationForItem } from '../domain/locations';
  import { binderStore } from '../state/binderStore';

  const FLIP_GESTURE_DISTANCE = 28;
  let gestureStart: { x: number; y: number; pointerId: number } | null = null;
  let enlargedIndex: number | null = null;

  $: project = $binderStore.project;
  $: ui = $binderStore.ui;
  $: item = project.items.find((candidate) => candidate.id === ui.shadowItemId);
  $: front = project.assets.find((asset) => asset.id === item?.frontScanId);
  $: back = project.assets.find((asset) => asset.id === item?.backScanId);
  $: hasNotes = Boolean(item?.notes.trim());
  $: gallery = item?.gallery ?? [];
  $: enlargedPhoto = enlargedIndex !== null ? (gallery[enlargedIndex] ?? null) : null;
  $: binderStore.syncLocationInput(item, 'shadow');
  $: if (!item) enlargedIndex = null;

  function showRelativePhoto(direction: -1 | 1) {
    if (enlargedIndex === null || !gallery.length) return;
    enlargedIndex = (enlargedIndex + direction + gallery.length) % gallery.length;
  }

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
      if (enlargedIndex !== null) {
        enlargedIndex = null;
      } else {
        binderStore.closeShadowbox();
      }
    } else if (enlargedIndex !== null && event.key === 'ArrowLeft') {
      showRelativePhoto(-1);
    } else if (enlargedIndex !== null && event.key === 'ArrowRight') {
      showRelativePhoto(1);
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
  <div class="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" tabindex="0" on:keydown={handleDialogKeydown}>
    <button class="fixed inset-0 bg-black/95" type="button" aria-label="Close item viewer" on:click={() => binderStore.closeShadowbox()}></button>
    <button class="fixed right-5 top-5 z-10 rounded-full border border-neutral-700 bg-neutral-950/75 p-3 text-neutral-100 shadow-lg backdrop-blur hover:bg-neutral-800" type="button" aria-label="Close item viewer" on:click={() => binderStore.closeShadowbox()}>
      <X size={18} />
    </button>
    <div class="relative flex h-full flex-col items-center justify-center px-4 py-6 pointer-events-none">
      <div class="flex h-full w-full max-w-6xl flex-col items-center gap-3 pointer-events-auto">
        {#if !ui.shadowEditing}
          <section class="flex w-full max-w-3xl shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center text-sm font-medium drop-shadow-2xl">
            <p class="text-neutral-100">{displayItemTitle(item)}</p>
            <p class="text-teal-300">{displayItemDate(item)}</p>
            {#if locationForItem(item)}
              <p class="text-amber-200">{displayItemLocation(item)}</p>
            {/if}
            <p class="text-neutral-300">{displayItemPeople(item)}</p>
          </section>
        {/if}

        <div
          class="flip-card relative min-h-0 w-full flex-1 cursor-grab select-none active:cursor-grabbing"
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

        <div class="flex shrink-0 items-center gap-2">
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

        {#if !ui.shadowEditing && gallery.length}
          <section class="w-full max-w-3xl shrink-0">
            <div class="flex justify-center gap-2 overflow-x-auto pb-1">
              {#each gallery as photo, index (photo.id)}
                <button
                  class="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-neutral-700 shadow-lg transition hover:border-teal-300"
                  type="button"
                  aria-label={`View ${photo.name}`}
                  on:click={() => (enlargedIndex = index)}
                >
                  <img class="h-full w-full object-cover" src={photo.image} alt={photo.name} />
                </button>
              {/each}
            </div>
          </section>
        {/if}

        {#if !ui.shadowEditing && hasNotes}
          <p class="max-h-16 max-w-3xl shrink-0 overflow-y-auto whitespace-pre-wrap text-center text-sm leading-6 text-neutral-200 drop-shadow-2xl">{displayItemNotes(item)}</p>
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

    {#if enlargedPhoto}
      <div class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-6" role="dialog" aria-modal="true" aria-label={enlargedPhoto.name}>
        <button class="fixed inset-0 bg-black/90" type="button" aria-label="Close photo" on:click={() => (enlargedIndex = null)}></button>

        <div class="relative flex w-full flex-1 items-center justify-center">
          {#if gallery.length > 1}
            <button
              class="absolute left-2 z-10 rounded-full border border-neutral-700 bg-neutral-950/75 p-3 text-neutral-100 shadow-lg backdrop-blur hover:bg-neutral-800 sm:left-6"
              type="button"
              aria-label="Previous photo"
              on:click={() => showRelativePhoto(-1)}
            >
              <ChevronLeft size={20} />
            </button>
          {/if}
          <img class="relative max-h-[70vh] max-w-full rounded object-contain shadow-2xl" src={enlargedPhoto.image} alt={enlargedPhoto.name} draggable="false" />
          {#if gallery.length > 1}
            <button
              class="absolute right-2 z-10 rounded-full border border-neutral-700 bg-neutral-950/75 p-3 text-neutral-100 shadow-lg backdrop-blur hover:bg-neutral-800 sm:right-6"
              type="button"
              aria-label="Next photo"
              on:click={() => showRelativePhoto(1)}
            >
              <ChevronRight size={20} />
            </button>
          {/if}
        </div>

        {#if gallery.length > 1}
          <div class="relative flex max-w-full gap-2 overflow-x-auto px-2 pb-1">
            {#each gallery as photo, index (photo.id)}
              <button
                class={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 shadow-lg transition ${index === enlargedIndex ? 'border-teal-300' : 'border-neutral-700 hover:border-neutral-500'}`}
                type="button"
                aria-label={`View ${photo.name}`}
                on:click={() => (enlargedIndex = index)}
              >
                <img class="h-full w-full object-cover" src={photo.image} alt={photo.name} />
              </button>
            {/each}
          </div>
        {/if}

        <button class="fixed right-5 top-5 rounded-full border border-neutral-700 bg-neutral-950/75 p-3 text-neutral-100 shadow-lg backdrop-blur hover:bg-neutral-800" type="button" aria-label="Close photo" on:click={() => (enlargedIndex = null)}>
          <X size={18} />
        </button>
      </div>
    {/if}
  </div>
{/if}
