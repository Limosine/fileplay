<script lang="ts">
  import { nanoid } from "nanoid";

  import { DeviceType, getDicebearUrl } from "$lib/lib/common";
  import { withDeviceType } from "$lib/lib/fetchers";
  import {
    editProperties,
    linkingCode,
    deviceParams,
    userParams,
  } from "$lib/lib/UI";

  let title = "";

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
    <input bind:value={$linkingCode} maxlength={6} placeholder="6-digit code" />
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
