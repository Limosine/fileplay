<script lang="ts">
  import type { Snippet } from "svelte";

  import { layout, openAddDialog, path } from "$lib/lib/UI";

  import Footer from "./Footer.svelte";
  import Header from "./Header.svelte";
  import Menu from "./Menu.svelte";
  import Rail from "./Rail.svelte";

  let {
    children,
  }: {
    children?: Snippet;
  } = $props();

  let header = $state(true);
  let rail = $state(false);
  let bar = $state(false);
  let add = $state(false);

  let contentClasses: string[] = $state(["content"]);

  const updateClasses = () => {
    const tempClasses = ["content"];

    if (header) tempClasses.push("header");
    if (rail) tempClasses.push("rail");
    if (bar) tempClasses.push("bar");

    contentClasses = tempClasses;
  };

  $effect(() => updateClasses());

  $effect(() => {
    if ($layout == "desktop") rail = true;
    else rail = false;

    if (
      $layout == "mobile" &&
      ($path.main == "send" || $path.main == "receive")
    )
      bar = true;
    else bar = false;

    if ($path.main == "contacts" || $path.main == "groups") add = true;
    else add = false;
  });
</script>

{#if rail}
  <Rail />
{/if}

{#if $layout == "mobile"}
  <Menu />
{/if}

{#if header}
  <Header />
{/if}

<div class={contentClasses.join(" ")}>
  {#if children}
    {@render children()}
  {/if}
</div>

{#if add}
  <button class="square round extra add" onclick={() => openAddDialog()}>
    <i>add</i>
  </button>
{/if}

{#if bar}
  <Footer />
{/if}

<style>
  .content {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: auto;
  }

  .content.header {
    top: 64px;
  }

  .content.rail {
    left: 80px;
  }

  .content.bar {
    bottom: 80px;
  }

  .add {
    position: fixed;
    bottom: 20px;
    right: 20px;

    margin: 0;
  }
</style>
