<script lang="ts">
  import {
    layout,
    openAddDialog,
    path,
  } from "$lib/lib/UI";

  import Footer from "./Footer.svelte";
  import Header from "./Header.svelte";
  import Menu from "./Menu.svelte";
  import Rail from "./Rail.svelte";

  let header = true;
  let rail = false;
  let bar = false;
  let add = false;

  let contentClasses: string[] = ["content"];

  const updateClasses = (header: boolean, rail: boolean, bar: boolean) => {
    const tempClasses = ["content"];

    if (header) tempClasses.push("header");
    if (rail) tempClasses.push("rail");
    if (bar) tempClasses.push("bar");

    contentClasses = tempClasses;
  };

  $: updateClasses(header, rail, bar);

  $: {
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
  }
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
  <slot />
</div>

{#if add}
  <button class="square round extra add" on:click={() => openAddDialog()}>
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
