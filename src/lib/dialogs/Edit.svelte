<script lang="ts">
  import { page } from "$app/stores";
  import { nanoid } from "nanoid";
  import { onMount } from "svelte";

  import { apiClient } from "$lib/api/client";
  import { DeviceType, getDicebearUrl } from "$lib/lib/common";
  import { withDeviceType } from "$lib/lib/fetchers";
  import {
    editProperties,
    linkingCode,
    deviceParams,
    userParams,
    editDialog,
  } from "$lib/lib/UI";

  onMount(() => {
    $editDialog.addEventListener("close", () => {
      if ($page.url.pathname == "/") {
        switch ($editProperties.mode) {
          case "username":
            if ($editProperties.originalValue != $userParams.display_name)
              apiClient("ws").sendMessage({
                type: "updateUser",
                data: {
                  display_name: $userParams.display_name,
                },
              });
            break;
          case "avatar":
            if ($editProperties.originalValue != $userParams.avatar_seed)
              apiClient("ws").sendMessage({
                type: "updateUser",
                data: {
                  avatar_seed: $userParams.avatar_seed,
                },
              });
            break;
          case "deviceName":
            if ($editProperties.originalValue != $deviceParams.display_name)
              apiClient("ws").sendMessage({
                type: "updateDevice",
                data: {
                  update: { display_name: $deviceParams.display_name },
                  did: $editProperties.did,
                },
              });
            break;
          case "deviceType":
            if ($editProperties.originalValue != $deviceParams.type)
              apiClient("ws").sendMessage({
                type: "updateDevice",
                data: {
                  update: { type: $deviceParams.type as DeviceType },
                  did: $editProperties.did,
                },
              });
            break;
        }
      }
    });
  });
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
  <p style="font-size: large; margin-bottom: 2px;">{$editProperties.title}</p>
  <div class="field">
    {#if $editProperties.mode == "deviceName"}
      <input
        bind:value={$deviceParams.display_name}
        placeholder="Google Pixel 5"
      />
    {:else if $editProperties.mode == "deviceType"}
      <nav style="display: grid; padding: 0;">
        {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
          <label class="radio">
            <input
              checked={$deviceParams.type == type}
              on:change={(event) =>
                ($deviceParams.type = event.currentTarget.value)}
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
      <input
        bind:value={$userParams.display_name}
        placeholder={$editProperties.title}
      />
    {/if}
  </div>
</dialog>
