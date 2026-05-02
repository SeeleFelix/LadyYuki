<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let { children } = $props();

  onMount(() => {
    document.body.classList.add("immersive");
  });

  onDestroy(() => {
    document.body.classList.remove("immersive");
  });
</script>

{@render children()}
