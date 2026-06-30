<script lang="ts">
  export let label: string;
  export let compact = false;
</script>

<label class="block">
  <span class={`${compact ? 'text-xs' : 'text-sm'} font-medium text-neutral-400`}>{label}</span>
  <slot />
</label>
