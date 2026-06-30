<script lang="ts">
  import type { BinderItem } from '../types';
  import { findLocationSuggestions } from '../domain/locations';
  import { binderStore } from '../state/binderStore';

  export let item: BinderItem;
  export let context: 'item' | 'shadow' = 'item';
  export let search = '';
  export let focused = false;

  $: suggestions = findLocationSuggestions(search).slice(0, 24);
</script>

<div class="relative mt-1">
  <input
    class="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
    value={search}
    placeholder="Start typing a city, park, or venue"
    autocomplete="off"
    on:focus={() => binderStore.setLocationFocused(context, true)}
    on:blur={() => window.setTimeout(() => binderStore.setLocationFocused(context, false), 120)}
    on:input={(event) => binderStore.handleLocationInput(item.id, (event.currentTarget as HTMLInputElement).value, context)}
  />
  {#if focused && search.trim().length >= 2}
    <div class="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-md border border-neutral-700 bg-neutral-950 shadow-2xl">
      {#if suggestions.length === 0}
        <div class="px-3 py-2 text-sm text-neutral-500">No matches found.</div>
      {:else}
        {#each suggestions as location (location.id)}
          <button
            class="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-800"
            type="button"
            on:mousedown|preventDefault={() => binderStore.selectLocationSuggestion(item.id, location, context)}
          >
            <span class="block font-medium text-neutral-100">{location.name}</span>
            <span class="block text-xs text-neutral-500">{[location.region, location.country].filter(Boolean).join(', ')} · {location.kind}</span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
