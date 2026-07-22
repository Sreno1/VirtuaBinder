<script lang="ts">
  import { Check, X } from '@lucide/svelte';
  import { themeSwatch } from '../theme/applyTheme';
  import { THEMES } from '../theme/themes';
  import { binderStore } from '../state/binderStore';

  export let onClose: () => void = () => {};

  $: ui = $binderStore.ui;
  $: darkThemes = THEMES.filter((theme) => theme.mode === 'dark');
  $: lightThemes = THEMES.filter((theme) => theme.mode === 'light');

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#snippet themeGrid(themes: typeof THEMES)}
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {#each themes as theme (theme.id)}
      {@const swatch = themeSwatch(theme)}
      {@const active = ui.theme === theme.id}
      <button
        class={`group flex flex-col gap-2 rounded-md border p-3 text-left transition ${active ? 'border-teal-400 bg-neutral-900' : 'border-neutral-800 bg-neutral-950 hover:border-neutral-600'}`}
        type="button"
        aria-pressed={active}
        on:click={() => binderStore.setTheme(theme.id)}
      >
        <div class="flex overflow-hidden rounded border border-neutral-800" style={`background:${swatch.background}`}>
          <span class="h-8 flex-1" style={`background:${swatch.surface}`}></span>
          <span class="h-8 w-8" style={`background:${swatch.accent}`}></span>
          <span class="h-8 w-8" style={`background:${swatch.warm}`}></span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-neutral-100">{theme.name}</span>
          {#if active}
            <Check size={15} class="shrink-0 text-teal-300" />
          {/if}
        </div>
      </button>
    {/each}
  </div>
{/snippet}

<div class="fixed inset-0 z-50 overflow-auto bg-black/90 p-4" role="dialog" aria-modal="true" tabindex="0" on:keydown={handleDialogKeydown}>
  <div class="mx-auto flex max-h-[calc(100vh-2rem)] max-w-3xl flex-col rounded-md border border-neutral-800 bg-neutral-950 shadow-2xl">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 p-4">
      <div>
        <h2 class="text-lg font-semibold text-neutral-50">Appearance</h2>
        <p class="text-sm text-neutral-400">Pick a color theme. Applies immediately and remembers your choice.</p>
      </div>
      <button class="rounded-md border border-neutral-700 p-2 text-neutral-200 hover:bg-neutral-800" type="button" aria-label="Close theme picker" on:click={onClose}>
        <X size={18} />
      </button>
    </header>

    <div class="space-y-6 overflow-auto p-4">
      <section>
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Dark</h3>
        {@render themeGrid(darkThemes)}
      </section>
      <section>
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Light</h3>
        {@render themeGrid(lightThemes)}
      </section>
    </div>
  </div>
</div>
