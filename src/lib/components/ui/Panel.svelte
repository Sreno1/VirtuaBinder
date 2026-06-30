<script lang="ts">
  export let className = '';
</script>

<section class={`rounded-md border border-neutral-800 bg-neutral-900 p-5 ${className}`}>
  <slot />
</section>
