<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  let { children } = $props();

  onMount(() => {
    document.body.classList.add("immersive");
    return () => {
      document.body.classList.remove("immersive");
    };
  });
</script>

{@render children()}
