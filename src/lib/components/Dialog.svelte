<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  import Add from "$lib/dialogs/Add.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";

  import { apiClient } from "$lib/api/client";

  import type { DeviceType } from "$lib/lib/common";
  import type { IDevices } from "$lib/lib/fetchers";
  import {
    checkProfanity,
    deviceParams,
    devices,
    dialogMode,
    editProperties,
    generalDialog,
    user,
    userParams,
  } from "$lib/lib/UI";
  import Privacy from "$lib/dialogs/Privacy.svelte";
  import PushRequest from "$lib/dialogs/PushRequest.svelte";
  import QrCode from "$lib/dialogs/QRCode.svelte";
  import Send from "$lib/dialogs/Send.svelte";

  onMount(() => {
    // TODO: Set interval on open, clear on close; refresh code if expired

    $generalDialog.addEventListener("close", async () => {
      setTimeout(() => {
        if (!$generalDialog.open) $dialogMode = undefined;
      }, 3100);

      // Edit dialog
      if ($dialogMode == "edit") {
        if ($editProperties.mode == "username") {
          await checkProfanity();
        }

        if ($page.url.pathname == "/setup") return;

        if ($editProperties.mode == "username") {
          if ($user.display_name != $userParams.display_name)
            apiClient("ws").sendMessage({
              type: "updateUser",
              data: {
                display_name: $userParams.display_name,
              },
            });
        } else if ($editProperties.mode == "avatar") {
          if ($user.avatar_seed != $userParams.avatar_seed)
            apiClient("ws").sendMessage({
              type: "updateUser",
              data: {
                avatar_seed: $userParams.avatar_seed,
              },
            });
        } else if (
          $editProperties.mode == "deviceName" ||
          $editProperties.mode == "deviceType"
        ) {
          if ($editProperties.did === undefined) return;

          let device: IDevices["self"];
          if ($devices.self.did === $editProperties.did) device = $devices.self;
          else {
            const d = $devices.others.find(
              (d) => d.did === $editProperties.did,
            );
            if (d !== undefined) device = d;
            else return;
          }

          if (
            $editProperties.mode == "deviceName" &&
            $editProperties.did !== undefined &&
            $deviceParams[$editProperties.did] !== undefined &&
            device.display_name !=
              $deviceParams[$editProperties.did].display_name
          )
            apiClient("ws").sendMessage({
              type: "updateDevice",
              data: {
                update: {
                  display_name: $deviceParams[$editProperties.did].display_name,
                },
                did: $editProperties.did,
              },
            });
          else if (
            $editProperties.mode == "deviceType" &&
            $editProperties.did !== undefined &&
            $deviceParams[$editProperties.did] !== undefined &&
            device.type != $deviceParams[$editProperties.did].type
          )
            apiClient("ws").sendMessage({
              type: "updateDevice",
              data: {
                update: {
                  type: $deviceParams[$editProperties.did].type as DeviceType,
                },
                did: $editProperties.did,
              },
            });
        }
      }
    });
  });
</script>

<dialog
  id="dialog-general"
  bind:this={$generalDialog}
  style={$dialogMode == "edit"
    ? $editProperties.mode == "deviceType"
      ? "min-height: 250px;"
      : $editProperties.mode == "avatar"
        ? "min-height: 240px;"
        : ""
    : ""}
>
  {#if $dialogMode == "add"}
    <Add />
  {:else if $dialogMode == "edit"}
    <Edit />
  {:else if $dialogMode == "privacy"}
    <Privacy />
  {:else if $dialogMode == "request"}
    <PushRequest />
  {:else if $dialogMode == "qrcode"}
    <QrCode />
  {:else if $dialogMode == "send"}
    <Send />
  {/if}
</dialog>
