<script lang="ts">
  import type { IDevices } from "$lib/lib/fetchers";
  import { getLastSend } from "$lib/lib/UI";
  import dayjs from "dayjs";

  import Badge from "../Badge.svelte";
  import Button from "../Button.svelte";

  let {
    device,
    subtitle = "",
    lastSeen = false,
    selected = false,
  }: {
    device: IDevices["self"] & { online?: boolean };
    subtitle?: string;
    lastSeen?: boolean;
    selected?: boolean;
  } = $props();
</script>

<Button on:click>
  <div id="circle" class={device.online ? "green-border" : undefined}>
    <i class="small"
      >{device.type == "desktop"
        ? "desktop_mac"
        : device.type == "tablet"
          ? "tablet_mac"
          : device.type == "phone"
            ? "phone_iphone"
            : "laptop_mac"}</i
    >

    {#if selected}
      <Badge />
    {/if}
  </div>

  <div>
    <p id="title">{device.display_name}</p>
    <p id="subtitle">
      {subtitle
        ? subtitle
        : `Created at ${dayjs.unix(device.created_at).format("HH:mm, DD.MM.YYYY")}.`}
    </p>
  </div>

  {#if lastSeen}
    <div class="max"></div>
    <div id="last-seen" class="bold">
      {#await getLastSend("device", device.did) then lastSend}
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
