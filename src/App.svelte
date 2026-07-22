<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { BookOpen, Download, Heart, MapPinned, Pencil, Play, Settings } from '@lucide/svelte';
  import BookletTab from './lib/components/BookletTab.svelte';
  import DataTab from './lib/components/DataTab.svelte';
  import MapTab from './lib/components/MapTab.svelte';
  import PreviewTab from './lib/components/PreviewTab.svelte';
  import Shadowbox from './lib/components/Shadowbox.svelte';
  import TemplatesTab from './lib/components/TemplatesTab.svelte';
  import ThemePicker from './lib/components/ThemePicker.svelte';
  import { binderStore } from './lib/state/binderStore';
  import type { Tab } from './lib/types';

  let themePickerOpen = false;

  onMount(() => {
    void binderStore.initialize();
  });

  onDestroy(() => {
    binderStore.destroy();
  });

  function tabClass(tab: Tab) {
    return `inline-flex h-full items-center gap-1.5 rounded-none border-x border-y-0 border-neutral-800 px-2.5 text-xs font-medium transition ${
      $binderStore.ui.activeTab === tab ? 'bg-teal-400 text-neutral-950' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
    }`;
  }
</script>

<svelte:head>
  <title>VirtuaBinder</title>
</svelte:head>

<main class="min-h-screen bg-neutral-950 text-neutral-100">
  <header class="border-b border-neutral-800 bg-neutral-950/90">
    <div class="mx-auto flex max-w-7xl flex-col items-stretch justify-between sm:px-3 lg:min-h-10 lg:flex-row">
      <div class="flex items-center px-3 py-1.5">
        <h1 class="text-base font-semibold tracking-normal text-neutral-50">VirtuaBinder</h1>
      </div>

      <div class="flex min-h-10 flex-1 items-stretch justify-between border-t border-neutral-800 lg:border-t-0 lg:border-l">
        <nav class="flex flex-wrap items-stretch" aria-label="Workflow">
          <button class={tabClass('booklet')} type="button" on:click={() => binderStore.setActiveTab('booklet')}>
            <BookOpen size={14} /> Booklet
          </button>
          <button class={tabClass('templates')} type="button" on:click={() => binderStore.setActiveTab('templates')}>
            <Pencil size={14} /> Stencils
          </button>
          <button class={tabClass('preview')} type="button" on:click={() => binderStore.setActiveTab('preview')}>
            <Play size={14} /> Preview
          </button>
          <button class={tabClass('map')} type="button" on:click={() => binderStore.setActiveTab('map')}>
            <MapPinned size={14} /> Map
          </button>
          <button class={tabClass('data')} type="button" on:click={() => binderStore.setActiveTab('data')}>
            <Download size={14} /> Data
          </button>
        </nav>
        <button
          class="inline-flex items-center gap-1.5 border-x border-neutral-800 px-2.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800"
          type="button"
          aria-label="Open appearance settings"
          title="Appearance"
          on:click={() => (themePickerOpen = true)}
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  </header>

  {#if !$binderStore.ui.ready}
    <section class="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div class="rounded-md border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">Loading binder workspace...</div>
    </section>
  {:else if $binderStore.ui.activeTab === 'templates'}
    <TemplatesTab />
  {:else if $binderStore.ui.activeTab === 'booklet'}
    <BookletTab />
  {:else if $binderStore.ui.activeTab === 'preview'}
    <PreviewTab />
  {:else if $binderStore.ui.activeTab === 'map'}
    <MapTab />
  {:else}
    <DataTab />
  {/if}

  <Shadowbox />

  {#if themePickerOpen}
    <ThemePicker onClose={() => (themePickerOpen = false)} />
  {/if}

  <footer class="border-t border-neutral-800 bg-neutral-950/90 px-4 py-4 text-xs text-neutral-500 sm:px-6">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
      <p>
        &copy; {new Date().getFullYear()} Steven Lykins ·
        <a class="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-300 hover:decoration-neutral-500" href="https://github.com/Sreno1/VirtuaBinder/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
      </p>
      <div class="flex items-center gap-4">
        <a class="inline-flex items-center gap-1.5 hover:text-neutral-300" href="https://github.com/Sreno1/VirtuaBinder" target="_blank" rel="noreferrer" aria-label="View source on GitHub">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.13-.02-2.04-3.2.7-3.88-1.36-3.88-1.36-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.71 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.19 1.83 1.19 3.09 0 4.44-2.7 5.42-5.28 5.7.42.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" /></svg>
          GitHub
        </a>
        <a class="inline-flex items-center gap-1.5 hover:text-neutral-300" href="https://ko-fi.com/I2I51WBHVL" target="_blank" rel="noreferrer" aria-label="Support this project on Ko-fi">
          <Heart size={14} />
          Support
        </a>
      </div>
    </div>
  </footer>
</main>
