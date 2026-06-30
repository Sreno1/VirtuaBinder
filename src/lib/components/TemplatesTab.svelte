<script lang="ts">
  import { Copy, Plus, Trash2 } from '@lucide/svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import Panel from './ui/Panel.svelte';
  import { clamp, round } from '../domain/id';
  import { scanOptionLabel } from '../domain/scans';
  import { slotPositionStyle } from '../domain/geometry';
  import { binderStore, selectAssets } from '../state/binderStore';
  import type { DrawRect } from '../types';

  let templateCanvas: HTMLDivElement;
  let drawing: DrawRect | null = null;

  $: project = $binderStore.project;
  $: ui = $binderStore.ui;
  $: selectedTemplate = project.templates.find((template) => template.id === ui.selectedTemplateId);
  $: assets = selectAssets(project);
  $: templatePreviewAsset =
    project.assets.find((asset) => asset.id === ui.templatePreviewAssetId) ?? assets.binderAssets[0];

  function pointerPercent(event: MouseEvent) {
    const rect = templateCanvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
    };
  }

  function startDraw(event: MouseEvent) {
    if (!templatePreviewAsset) return;
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

  function finishDraw() {
    if (!drawing) return;
    binderStore.addDrawnSlot(drawing);
    drawing = null;
  }
</script>

<svelte:window on:mousemove={moveDraw} on:mouseup={finishDraw} />

<section class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[340px_1fr_310px]">
  <Panel>
    <h2 class="text-lg font-semibold text-neutral-50">Stencil library</h2>
    <div class="mt-4 flex flex-wrap gap-2">
      <button class="inline-flex items-center gap-2 rounded-md bg-teal-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-teal-400" type="button" on:click={() => binderStore.addTemplate('grid')}>
        <Plus size={16} /> 3x3
      </button>
      <button class="inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-300" type="button" on:click={() => binderStore.addTemplate('photo')}>
        <Plus size={16} /> 2x2
      </button>
      <button class="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800" type="button" on:click={() => binderStore.addTemplate('blank')}>
        <Plus size={16} /> Blank
      </button>
    </div>

    <div class="mt-5 space-y-2">
      {#each project.templates as template (template.id)}
        <button
          class={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-neutral-800 ${template.id === ui.selectedTemplateId ? 'border-teal-400 bg-teal-400 text-neutral-950' : 'border-neutral-800'}`}
          type="button"
          on:click={() => binderStore.setSelectedTemplate(template.id)}
        >
          <span class="truncate">{template.name}</span>
          <span class="ml-3 text-xs opacity-70">{template.slots.length}</span>
        </button>
      {/each}
    </div>

    <div class="mt-5 grid grid-cols-2 gap-2">
      <button class="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800" type="button" on:click={() => binderStore.duplicateTemplate()}>
        <Copy size={16} /> Copy
      </button>
      <button class="inline-flex items-center justify-center gap-2 rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950" type="button" on:click={() => ui.selectedTemplateId && binderStore.deleteTemplate(ui.selectedTemplateId)}>
        <Trash2 size={16} /> Delete
      </button>
    </div>
  </Panel>

  <Panel>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <label class="block">
        <span class="text-sm font-medium text-neutral-400">Stencil name</span>
        <input
          class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          value={selectedTemplate?.name ?? ''}
          on:input={(event) => binderStore.updateTemplateName((event.currentTarget as HTMLInputElement).value)}
        />
      </label>

      <label class="block sm:min-w-72">
        <span class="text-sm font-medium text-neutral-400">Preview scan</span>
        <select
          class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          value={templatePreviewAsset?.id ?? ''}
          on:change={(event) => binderStore.setTemplatePreviewAsset((event.currentTarget as HTMLSelectElement).value)}
        >
          {#if assets.binderAssets.length === 0}
            <option value="">No binder scans</option>
          {/if}
          {#each assets.binderAssets as asset (asset.id)}
            <option value={asset.id}>{scanOptionLabel(asset)}</option>
          {/each}
        </select>
      </label>
    </div>

    {#if !templatePreviewAsset}
      <div class="mt-5">
        <EmptyState text="Import at least one binder-page scan to draw a stencil over it." />
      </div>
    {:else}
      <div class="mt-5 overflow-auto rounded-md bg-neutral-950 p-3">
        <div
          bind:this={templateCanvas}
          class="relative mx-auto max-h-[72vh] w-fit cursor-crosshair select-none overflow-hidden rounded bg-neutral-900 shadow-sm"
          role="button"
          aria-label="Stencil drawing surface. Press Enter to add a manual slot."
          tabindex="0"
          on:mousedown={startDraw}
          on:keydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') binderStore.addManualSlot();
          }}
        >
          <img class="block max-h-[72vh] max-w-full" src={templatePreviewAsset.image} alt={templatePreviewAsset.name} draggable="false" />
          {#if selectedTemplate}
            {#each selectedTemplate.slots as slot (slot.id)}
              <button
                data-slot-id={slot.id}
                class={`absolute flex items-start justify-start border-2 p-1 text-xs font-semibold text-neutral-50 ${slot.id === ui.selectedSlotId ? 'border-amber-300 bg-amber-300/30' : 'border-teal-400 bg-teal-300/20'}`}
                style={slotPositionStyle(slot)}
                type="button"
                title={`Slot ${slot.label}`}
                on:mousedown={(event) => event.stopPropagation()}
                on:click={() => binderStore.setSelectedSlot(slot.id)}
              >
                {slot.label}
              </button>
            {/each}
          {/if}
          {#if drawing}
            <div class="absolute border-2 border-amber-400 bg-amber-300/20" style={`left:${drawing.x}%;top:${drawing.y}%;width:${drawing.w}%;height:${drawing.h}%;`}></div>
          {/if}
        </div>
      </div>
    {/if}
  </Panel>

  <Panel>
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-neutral-50">Boundaries</h2>
      <button class="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800" type="button" on:click={() => binderStore.addManualSlot()}>
        <Plus size={16} /> Slot
      </button>
    </div>

    {#if !selectedTemplate || selectedTemplate.slots.length === 0}
      <p class="mt-4 rounded-md bg-neutral-950 p-4 text-sm text-neutral-400">Draw on the preview image or add a slot manually.</p>
    {:else}
      <div class="mt-4 space-y-3">
        {#each selectedTemplate.slots as slot (slot.id)}
          <div class={`rounded-md border p-3 ${slot.id === ui.selectedSlotId ? 'border-teal-400' : 'border-neutral-800'}`}>
            <div class="flex items-center gap-2">
              <input
                class="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
                value={slot.label}
                aria-label="Slot label"
                on:input={(event) => binderStore.updateSlot(slot.id, { label: (event.currentTarget as HTMLInputElement).value })}
                on:focus={() => binderStore.setSelectedSlot(slot.id)}
              />
              <button class="rounded-md border border-red-900/70 p-2 text-red-300 hover:bg-red-950" type="button" aria-label="Delete slot" on:click={() => binderStore.removeSlot(slot.id)}>
                <Trash2 size={16} />
              </button>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
              <label>X <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1" type="number" min="0" max="100" step="0.1" value={slot.x} on:input={(event) => binderStore.updateSlot(slot.id, { x: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
              <label>Y <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1" type="number" min="0" max="100" step="0.1" value={slot.y} on:input={(event) => binderStore.updateSlot(slot.id, { y: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
              <label>W <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1" type="number" min="1" max="100" step="0.1" value={slot.w} on:input={(event) => binderStore.updateSlot(slot.id, { w: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
              <label>H <input class="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1" type="number" min="1" max="100" step="0.1" value={slot.h} on:input={(event) => binderStore.updateSlot(slot.id, { h: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Panel>
</section>
