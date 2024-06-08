<script lang="ts">
  import dayjs from "dayjs";

  import { apiClient } from "$lib/api/client";
  import {
    devices,
    openAddDialog,
    openEditDialog,
    pathBackwards,
  } from "$lib/lib/UI";

  import Button from "$lib/components/Button.svelte";
  import Fullscreen from "$lib/components/Fullscreen.svelte";
</script>

<Fullscreen header="Devices" backAction={pathBackwards}>
  <Button
    onclick={async () =>
      apiClient("ws").sendMessage({
        type: "updateDevice",
        data: {
          update: {
            display_name: await openEditDialog(
              {
                title: "Device name",
                placeholder: "Google Pixel 5",
                type: "string",
              },
              $devices.self.display_name,
            ),
          },
        },
      })}
  >
    <div>
      <p id="title">
        {$devices.self.display_name}
      </p>
      <p id="subtitle">This device.</p>
    </div>
  </Button>
  {#each $devices.others as device}
    <div class="divider"></div>

    <Button
      onclick={async () =>
        apiClient("ws").sendMessage({
          type: "updateDevice",
          data: {
            did: device.did,
            update: {
              display_name: await openEditDialog(
                {
                  title: "Device name",
                  placeholder: "Google Pixel 5",
                  type: "string",
                },
                device.display_name,
              ),
            },
          },
        })}
    >
      <div>
        <p id="title">
          {device.display_name}
        </p>
        <p id="subtitle">
          Created at {dayjs
            .unix(device.created_at)
            .format("HH:mm, DD.MM.YYYY")}.
        </p>
      </div>
    </Button>
  {/each}

  {#snippet footerSnippet()}
    <button
      id="next-button"
      class="square round extra"
      onclick={() => openAddDialog()}
    >
      <i>add</i>
    </button>
  {/snippet}
</Fullscreen>

<style>
  #next-button {
    position: fixed;
    margin: 0;
    bottom: 20px;
    right: 20px;
  }
</style>
