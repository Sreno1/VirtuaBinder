<script lang="ts">
  export let value: string;
  export let options: { value: string; label: string }[] = [];
</script>

<div class="inline-flex rounded-md border border-neutral-700 bg-neutral-950 p-1">
  {#each options as option (option.value)}
    <button
      class={`rounded px-3 py-1.5 text-sm font-medium transition ${value === option.value ? 'bg-teal-400 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800'}`}
      type="button"
      on:click={() => {
        value = option.value;
      }}
    >
      {option.label}
    </button>
  {/each}
</div>
