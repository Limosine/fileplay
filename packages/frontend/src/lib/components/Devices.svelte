<script lang="ts">
  import dayjs from "dayjs";

  import { apiClient } from "$lib/api/client";
  import { ui_object } from "$lib/lib/UI.svelte";

  import Button from "$lib/components/Button.svelte";
  import Fullscreen from "$lib/components/Fullscreen.svelte";
</script>

<Fullscreen header="Devices" backAction={ui_object.pathBackwards}>
  <Button
    onclick={async () =>
      ui_object.devices !== undefined &&
      apiClient("ws").sendMessage({
        type: "updateDevice",
        data: {
          update: {
            display_name: await ui_object.openEditDialog(
              {
                title: "Device name",
                placeholder: "Google Pixel 5",
                type: "string",
              },
              ui_object.devices.self.display_name,
            ),
          },
        },
      })}
  >
    <div>
      <p id="title">
        {ui_object.devices?.self.display_name || ""}
      </p>
      <p id="subtitle">This device.</p>
    </div>
  </Button>
  {#if ui_object.devices !== undefined}
    {#each ui_object.devices.others as device}
      <div class="divider"></div>

      <Button
        onclick={async () =>
          apiClient("ws").sendMessage({
            type: "updateDevice",
            data: {
              did: device.did,
              update: {
                display_name: await ui_object.openEditDialog(
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
  {/if}

  {#snippet footerSnippet()}
    <button
      id="next-button"
      class="square round extra"
      onclick={() => ui_object.openAddDialog()}
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
