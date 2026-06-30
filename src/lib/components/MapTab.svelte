<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import L, { type LayerGroup, type Map } from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { MapPinned } from '@lucide/svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import Panel from './ui/Panel.svelte';
  import { displayItemDate, displayItemTitle } from '../domain/items';
  import { buildMapPins, locationForItem, locationOptionLabel, MAP_BOUNDS } from '../domain/locations';
  import { binderStore } from '../state/binderStore';
  import type { MapPinGroup } from '../types';

  let mapElement: HTMLDivElement;
  let map: Map | null = null;
  let markerLayer: LayerGroup | null = null;

  $: project = $binderStore.project;
  $: mapPins = buildMapPins(project.items);
  $: mappedItemCount = project.items.filter((item) => locationForItem(item)).length;
  $: if (map && markerLayer) renderPins(mapPins);

  function pinIcon(pin: MapPinGroup) {
    return L.divIcon({
      className: '',
      html: `<div class="map-pin"><span>${pin.items.length}</span></div>`,
      iconSize: [34, 42],
      iconAnchor: [17, 42]
    });
  }

  function renderPins(pins: MapPinGroup[]) {
    if (!markerLayer || !map) return;
    markerLayer.clearLayers();
    for (const pin of pins) {
      L.marker([pin.location.lat, pin.location.lon], { icon: pinIcon(pin), title: locationOptionLabel(pin.location) })
        .on('click', () => binderStore.openItemShadowbox(pin.items[0].id))
        .addTo(markerLayer);
    }
  }

  onMount(() => {
    const bounds = L.latLngBounds([MAP_BOUNDS.south, MAP_BOUNDS.west], [MAP_BOUNDS.north, MAP_BOUNDS.east]);
    map = L.map(mapElement, {
      maxBounds: bounds.pad(0.12),
      maxBoundsViscosity: 0.9,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    map.fitBounds(bounds);
    renderPins(mapPins);
  });

  onDestroy(() => {
    map?.remove();
    map = null;
    markerLayer = null;
  });
</script>

<section class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
  <div class="space-y-4">
    <div class="rounded-md border border-teal-900/40 bg-neutral-900 p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-neutral-50">Location Map</h2>
          <p class="mt-1 text-sm text-neutral-300">{mapPins.length} mapped location{mapPins.length === 1 ? '' : 's'} from {mappedItemCount} item{mappedItemCount === 1 ? '' : 's'}.</p>
        </div>
        <div class="inline-flex w-fit items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300">
          <MapPinned size={16} /> North America
        </div>
      </div>
    </div>

    {#if mapPins.length === 0}
      <EmptyState text="Add locations to item records to place pins on this map." />
    {:else}
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div class="min-h-[520px] overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
          <div bind:this={mapElement} class="h-[640px] min-h-[520px] w-full" aria-label="Zoomable map of North America"></div>
        </div>

        <Panel className="max-h-[640px] overflow-auto">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Mapped items</h3>
          <div class="mt-4 space-y-3">
            {#each mapPins as pin (pin.location.id)}
              <article class="rounded-md border border-neutral-800 bg-neutral-950 p-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h4 class="font-semibold text-neutral-50">{pin.location.name}</h4>
                    <p class="mt-1 text-xs text-neutral-400">{pin.location.region}, {pin.location.country} · {pin.location.kind}</p>
                  </div>
                  <span class="rounded-md bg-teal-400 px-2 py-1 text-xs font-semibold text-neutral-950">{pin.items.length}</span>
                </div>
                <div class="mt-3 grid gap-2">
                  {#each pin.items as item (item.id)}
                    <button class="rounded-md border border-neutral-800 px-3 py-2 text-left text-sm hover:border-teal-500 hover:bg-neutral-800" type="button" on:click={() => binderStore.openItemShadowbox(item.id)}>
                      <span class="block font-medium text-neutral-100">{displayItemTitle(item)}</span>
                      <span class="mt-1 block text-xs text-neutral-500">{displayItemDate(item)}</span>
                    </button>
                  {/each}
                </div>
              </article>
            {/each}
          </div>
        </Panel>
      </div>
    {/if}
  </div>
</section>
