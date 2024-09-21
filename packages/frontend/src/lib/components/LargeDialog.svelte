<script lang="ts">
  import { onMount } from "svelte";

  import {
    changePath,
    devices,
    groupProperties,
    largeDialog,
    layout,
    path,
  } from "$lib/lib/UI";

  import Devices from "./Devices.svelte";
  import Select from "./Select.svelte";
  import GroupProperties from "./GroupProperties.svelte";
  import GroupCreate from "./GroupCreate.svelte";

  let groupPropertiesPage: "main" | "members" | "requests" | "add" =
    $state("main");

  let groupCreatePage: "add" | "name" = $state("add");
  let groupCreateSelected: {
    uid: number;
    avatar_seed: string;
    display_name: string;
  }[] = $state([]);
  let groupCreateName = $state("");

  onMount(() => {
    $largeDialog.addEventListener("close", () => {
      if (
        $layout == "mobile" &&
        $path.main == "settings" &&
        $path.sub !== undefined
      )
        changePath({ main: "settings" });

      if (groupPropertiesPage)
        setTimeout(() => (groupPropertiesPage = "main"), 400);

      if (groupCreatePage)
        setTimeout(() => {
          groupCreatePage = "add";
          groupCreateSelected = [];
          groupCreateName = "";
        }, 400);
    });
  });
</script>

<dialog id="dialog-large" bind:this={$largeDialog} class="right large">
  {#if $path.main == "send" || ($layout == "desktop" && $path.main == "receive")}
    <Select />
  {:else if $path.main == "groups"}
    {#if $groupProperties.mode == "create"}
      <GroupCreate
        bind:page={groupCreatePage}
        bind:selected={groupCreateSelected}
        bind:name={groupCreateName}
      />
    {:else}
      <GroupProperties
        bind:page={groupPropertiesPage}
        gid={$groupProperties.gid}
      />
    {/if}
  {:else if $path.main == "settings" && $devices !== undefined}
    <Devices />
  {/if}
</dialog>

<style>
  #dialog-large {
    padding: 0;
  }
</style>
