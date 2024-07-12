<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";

  import type { IGroup } from "$lib/lib/fetchers";
  import { getLastSend, groupDevices } from "$lib/lib/UI";

  import Badge from "../Badge.svelte";
  import Button from "../Button.svelte";

  let {
    group,
    subtitle = "",
    lastSeen = true,
    selected = false,
    onclick,
  }: {
    group: IGroup;
    subtitle?: string;
    lastSeen?: boolean;
    selected?: boolean;
    onclick?: MouseEventHandler<HTMLAnchorElement>;
  } = $props();
</script>

<Button {onclick}>
  {@const devices = $groupDevices.filter((d) => d.gid === group.gid).length}
  <div id="circle" class={devices < 1 ? undefined : "green-border"}>
    {devices < 1 ? "" : devices}

    {#if selected}
      <Badge />
    {/if}
  </div>

  <div>
    <p id="title">{group.name}</p>
    <p id="subtitle">
      {subtitle
        ? subtitle
        : `Contains ${group.members.length} member${
            group.members.length === 1 ? "" : "s"
          }`}
    </p>
  </div>

  {#if lastSeen}
    <div class="max"></div>
    <div id="last-seen" class="bold">
      {#await getLastSend("group", group.gid) then lastSend}
        {lastSend}
      {/await}
    </div>
  {/if}
</Button>

<style>
  #circle {
    width: 45px;
    height: 45px;

    line-height: 35px;
    text-align: center;
    font-size: large;

    position: relative;

    border: 5px solid var(--tertiary);
    border-radius: 50%;
  }

  #last-seen {
    font-size: small;
    padding-bottom: 18px;
  }
</style>
