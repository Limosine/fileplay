<script lang="ts">
  import { page } from "$app/stores";
  import { nanoid } from "nanoid";
  import { onMount } from "svelte";

  import { apiClient } from "$lib/api/client";
  import { DeviceType, getDicebearUrl } from "$lib/lib/common";
  import { withDeviceType, type IDevices } from "$lib/lib/fetchers";
  import {
    editProperties,
    linkingCode,
    deviceParams,
    userParams,
    editDialog,
    user,
    devices,
    checkProfanity,
  } from "$lib/lib/UI";

  let title = "";

  onMount(() => {
    $editDialog.addEventListener("close", async () => {
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
          const d = $devices.others.find((d) => d.did === $editProperties.did);
          if (d !== undefined) device = d;
          else return;
        }

        if (
          $editProperties.mode == "deviceName" &&
          $editProperties.did !== undefined &&
          $deviceParams[$editProperties.did] !== undefined &&
          device.display_name != $deviceParams[$editProperties.did].display_name
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
    });
  });

  $: title =
    $editProperties.mode == "deviceName"
      ? "Device name"
      : $editProperties.mode == "deviceType"
        ? "Device type"
        : $editProperties.mode == "username"
          ? "Username"
          : $editProperties.mode == "avatar"
            ? "Avatar"
            : $editProperties.mode == "linkingCode"
              ? "Linking code"
              : "";
</script>

<dialog
  bind:this={$editDialog}
  id="dialog-edit"
  style={$editProperties.mode == "deviceType"
    ? "min-height: 250px;"
    : $editProperties.mode == "avatar"
      ? "min-height: 240px;"
      : ""}
>
  <p style="font-size: large; margin-bottom: 2px;">
    {title}
  </p>
  <div class="field">
    {#if $editProperties.mode == "deviceName" && $editProperties.did !== undefined && $deviceParams[$editProperties.did] !== undefined}
      <input
        bind:value={$deviceParams[$editProperties.did].display_name}
        placeholder="Google Pixel 5"
      />
    {:else if $editProperties.mode == "deviceType"}
      <nav style="display: grid; padding: 0;">
        {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
          <label class="radio">
            <input
              checked={$editProperties.did !== undefined &&
                $deviceParams[$editProperties.did].type == type}
              on:change={(event) =>
                $editProperties.did !== undefined &&
                ($deviceParams[$editProperties.did].type =
                  event.currentTarget.value)}
              type="radio"
              name="deviceType"
              value={type}
            />
            <span style="padding-left: 20px;">{name}</span>
          </label>
        {/each}
      </nav>
    {:else if $editProperties.mode == "linkingCode"}
      <input
        bind:value={$linkingCode}
        maxlength={6}
        placeholder="6-digit code"
      />
    {:else if $editProperties.mode == "avatar"}
      <div class="center-align">
        <img
          id="avatar-image"
          src={getDicebearUrl($userParams.avatar_seed, 100)}
          width="100"
          alt="Avatar"
        />
      </div>
      <nav class="right-align" style="padding: 10px 0 0 0;">
        <button
          class="border"
          style="border: 0;"
          on:click={() => ($userParams.avatar_seed = nanoid(8))}
          >Change Avatar</button
        >
      </nav>
    {:else}
      <input bind:value={$userParams.display_name} placeholder={title} />
    {/if}
  </div>
</dialog>
