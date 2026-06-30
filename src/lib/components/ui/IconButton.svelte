<script lang="ts">
  export let label: string;
  export let title = label;
  export let active = false;
  export let danger = false;
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';

  $: tone = danger
    ? 'border-red-900/70 text-red-300 hover:bg-red-950'
    : active
      ? 'border-teal-400 bg-teal-400 text-neutral-950 hover:bg-teal-300'
      : 'border-neutral-700 bg-neutral-950/75 text-neutral-100 hover:bg-neutral-800';
</script>

<button
  class={`inline-flex items-center justify-center rounded-md border p-2 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${tone}`}
  {type}
  aria-label={label}
  {title}
  {disabled}
  on:click
>
  <slot />
</button>
