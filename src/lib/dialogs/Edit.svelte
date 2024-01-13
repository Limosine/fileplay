<script lang="ts">
  import { page } from "$app/stores";
  import { nanoid } from "nanoid";
  import { onMount } from "svelte";

  import { DeviceType, getDicebearUrl } from "$lib/lib/common";
  import { withDeviceType } from "$lib/lib/fetchers";
  import {
    edit_current as current,
    title,
    linkingCode,
    original_value,
    did,
    deviceParams,
    userParams,
    editDialog,
  } from "$lib/lib/UI";
  import { trpc } from "$lib/trpc/client";

  onMount(() => {
    $editDialog.addEventListener("close", () => {
      if ($page.url.pathname == "/") {
        switch ($current) {
          case "username":
            if ($original_value != $userParams.display_name)
              trpc().updateUser.mutate({
                display_name: $userParams.display_name,
              });
            break;
          case "avatar":
            if ($original_value != $userParams.avatar_seed)
              trpc().updateUser.mutate({
                avatar_seed: $userParams.avatar_seed,
              });
            break;
          case "deviceName":
            if ($original_value != $deviceParams.display_name)
              trpc().updateDevice.mutate({
                update: { display_name: $deviceParams.display_name },
                did: $did,
              });
            break;
          case "deviceType":
            if ($original_value != $deviceParams.type)
              trpc().updateDevice.mutate({
                // @ts-ignore
                update: { type: $deviceParams.type },
                did: $did,
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
        bind:value={$deviceParams.display_name}
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
        maxlength={6}
        placeholder="6-digit code"
      />
    {:else if $current == "avatar"}
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
      <input bind:value={$userParams.display_name} placeholder={$title} />
    {/if}
  </div>
</dialog>
