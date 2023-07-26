<script lang="ts">
  import { nanoid } from "nanoid";

  import {
    edit_current as current,
    title,
    linkingCode,
    original_value,
    did,
  } from "$lib/UI";
  import { DeviceType, getDicebearUrl } from "$lib/common";
  import { withDeviceType } from "$lib/personal";
  import { deviceParams, userParams } from "$lib/stores/Dialogs";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  let edit: HTMLDialogElement;

  async function updateDeviceInfo(did: number) {
    let update = {};

    if ($deviceParams.displayName) {
      update = { displayName: $deviceParams.displayName };
    }
    if ($deviceParams.type) {
      update = { ...update, type: $deviceParams.type };
    }

    if (Object.keys(update).length) {
      await fetch(`/api/devices?${did}`, {
        method: "POST",
        body: JSON.stringify(update),
      });
    }
  }

  async function updateUserInfo() {
    let update = {};

    if ($userParams.displayName) {
      update = { displayName: $userParams.displayName };
    }
    if ($userParams.avatarSeed) {
      update = { ...update, avatarSeed: $userParams.avatarSeed };
    }

    if (Object.keys(update).length) {
      await fetch("/api/user", {
        method: "POST",
        body: JSON.stringify(update),
      });
    }
  }

  onMount(() => {
    edit.addEventListener("close", () => {
      if ($page.url.pathname == "/") {
        switch ($current) {
          case "username":
            if ($original_value != $userParams.displayName) updateUserInfo();
            break;
          case "avatar":
            if ($original_value != $userParams.avatarSeed) updateUserInfo();
            break;
          case "deviceName":
            if ($original_value != $deviceParams.displayName) updateDeviceInfo($did);
            break;
          case "deviceType":
            if ($original_value != $deviceParams.type) updateDeviceInfo($did);
            break;
        }
      }
    });
  });
</script>

<dialog
  bind:this={edit}
  id="dialog-edit"
  style={$current == "deviceType"
    ? "min-height: 250px;"
    : $current == "avatar"
    ? "min-height: 240px;"
    : ""}
>
  <p style="font-size: large; margin-bottom: 2px;">{$title}</p>
  <div class="field">
    {#if $current == "deviceName"}
      <input
        bind:value={$deviceParams.displayName}
        placeholder="Google Pixel 5"
      />
    {:else if $current == "deviceType"}
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
    {:else if $current == "linkingCode"}
      <input
        bind:value={$linkingCode}
        inputmode="numeric"
        maxlength={6}
        placeholder="6-digit code"
      />
    {:else if $current == "avatar"}
      <div class="center-align">
        <img
          id="avatar-image"
          src={getDicebearUrl($userParams.avatarSeed, 150)}
          alt="Avatar"
        />
      </div>
      <nav class="right-align" style="padding: 10px 0 0 0;">
        <button
          class="border"
          style="border: 0;"
          on:click={() => ($userParams.avatarSeed = nanoid(8))}
          >Change Avatar</button
        >
      </nav>
    {:else}
      <input bind:value={$userParams.displayName} placeholder={$title} />
    {/if}
  </div>
</dialog>
