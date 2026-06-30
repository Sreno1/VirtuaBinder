<script lang="ts">
  import { Download, Trash2, Upload } from '@lucide/svelte';
  import Panel from './ui/Panel.svelte';
  import { binderStore } from '../state/binderStore';

  $: project = $binderStore.project;

  function importJson(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) void binderStore.importJson(file);
    (event.currentTarget as HTMLInputElement).value = '';
  }

  function clearAll() {
    if (confirm('Clear the current binder project from this browser?')) {
      void binderStore.clearAll();
    }
  }
</script>

<section class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
  <Panel>
    <h2 class="text-lg font-semibold text-neutral-50">Backup and restore</h2>
    <p class="mt-2 text-sm text-neutral-400">The app auto-saves into this browser using IndexedDB. Export a JSON copy when you want a portable archive of the booklet data and rendered scan images.</p>

    <div class="mt-5 flex flex-wrap gap-3">
      <button class="inline-flex items-center gap-2 rounded-md bg-teal-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-teal-400" type="button" on:click={() => binderStore.exportJson()}>
        <Download size={16} /> Export JSON
      </button>
      <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800">
        <Upload size={16} /> Import JSON
        <input class="sr-only" type="file" accept="application/json,.json" on:change={importJson} />
      </label>
      <button class="inline-flex items-center gap-2 rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950" type="button" on:click={clearAll}>
        <Trash2 size={16} /> Clear browser copy
      </button>
    </div>

    <dl class="mt-6 grid gap-3 text-sm sm:grid-cols-4">
      <div class="rounded-md bg-neutral-950 p-3">
        <dt class="text-neutral-500">Scans</dt>
        <dd class="mt-1 text-xl font-semibold">{project.assets.length}</dd>
      </div>
      <div class="rounded-md bg-neutral-950 p-3">
        <dt class="text-neutral-500">Stencils</dt>
        <dd class="mt-1 text-xl font-semibold">{project.templates.length}</dd>
      </div>
      <div class="rounded-md bg-neutral-950 p-3">
        <dt class="text-neutral-500">Pages</dt>
        <dd class="mt-1 text-xl font-semibold">{project.pages.length}</dd>
      </div>
      <div class="rounded-md bg-neutral-950 p-3">
        <dt class="text-neutral-500">Items</dt>
        <dd class="mt-1 text-xl font-semibold">{project.items.length}</dd>
      </div>
    </dl>
  </Panel>
</section>
