<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { BookOpen, Download, MapPinned, Pencil, Play } from '@lucide/svelte';
  import BookletTab from './lib/components/BookletTab.svelte';
  import DataTab from './lib/components/DataTab.svelte';
  import MapTab from './lib/components/MapTab.svelte';
  import PreviewTab from './lib/components/PreviewTab.svelte';
  import Shadowbox from './lib/components/Shadowbox.svelte';
  import TemplatesTab from './lib/components/TemplatesTab.svelte';
  import { binderStore } from './lib/state/binderStore';
  import type { Tab } from './lib/types';

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
  <title>Timeline Binder</title>
</svelte:head>

<main class="min-h-screen bg-neutral-950 text-neutral-100">
  <header class="border-b border-neutral-800 bg-neutral-950/90">
    <div class="mx-auto flex max-w-7xl flex-col items-stretch justify-between sm:px-3 lg:min-h-10 lg:flex-row">
      <div class="flex items-center px-3 py-1.5">
        <h1 class="text-base font-semibold tracking-normal text-neutral-50">Timeline Binder</h1>
      </div>

      <nav class="flex min-h-10 flex-wrap items-stretch border-t border-neutral-800 lg:border-t-0 lg:border-l" aria-label="Workflow">
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
</main>
