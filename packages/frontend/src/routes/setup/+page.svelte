<script lang="ts">
  import { nanoid } from "nanoid";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";
  import * as materialSymbols from "beercss/dist/cdn/material-symbols-outlined.woff2";

  import { apiClient } from "$lib/api/client";
  import { DeviceType, getDicebearUrl } from "../../../../common/common";
  import { clearObjectStores } from "$lib/lib/history";
  import {
    deviceParams,
    userParams,
    profaneUsername,
    linkingCode,
    width,
    layout,
    height,
    openEditDialog,
  } from "$lib/lib/UI";
  import { ValueToName } from "$lib/lib/utils";

  import logo from "$lib/assets/Fileplay.svg";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Username from "$lib/components/Username.svelte";

  let webManifest = $state("");

  // Options
  let progress = $state(0);
  let setupError: string = $state("");
  let actionDisabled = $state(true);

  let existing = $state(false);

  // Setup (confirm)
  const handleResponseError = async (res: Response) => {
    const json_ = await res.json();
    if (json_) {
      if (json_ instanceof Error) setupError = json_.message;
      else setupError = JSON.stringify(json_);
    } else {
      setupError = res.status.toString();
    }
  };

  const handleConfirm = async () => {
    // Setup device
    const res = await apiClient("http").setupDevice({
      display_name: $deviceParams[0].display_name,
      type: $deviceParams[0].type,
    });

    if (Array.from(res.status.toString())[0] != "2") {
      return handleResponseError(res);
    }

    if (existing) {
      // Link to existing user
      const res = await apiClient("http").setupDevice($linkingCode);

      if (Array.from(res.status.toString())[0] != "2") {
        return handleResponseError(res);
      }
    } else {
      // Setup user
      const res = await apiClient("http").setupUser({
        display_name: $userParams.display_name,
        avatar_seed: $userParams.avatar_seed,
      });

      if (Array.from(res.status.toString())[0] != "2") {
        return handleResponseError(res);
      }
    }

    localStorage.removeItem("deviceParams");
    localStorage.setItem("loggedIn", "true");

    await clearObjectStores();
    location.href = "/";
  };

  onMount(() => {
    if (pwaInfo) webManifest = pwaInfo.webManifest.linkTag;

    progress = 1;

    // Generate avatar seed
    $userParams.avatar_seed = nanoid(8);
  });

  $effect(() => {
    if (!$deviceParams[0].display_name || !$deviceParams[0].type)
      actionDisabled = true;
    else if (!existing) {
      actionDisabled =
        !$userParams.display_name ||
        $profaneUsername.profane ||
        $profaneUsername.loading ||
        !$userParams.avatar_seed;
    } else actionDisabled = !$linkingCode;
  });
</script>

<svelte:window bind:innerHeight={$height} bind:innerWidth={$width} />

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
  <link
    rel="preload"
    as="font"
    href={materialSymbols.default}
    type="font/woff2"
    crossorigin="anonymous"
  />
</svelte:head>

<Dialog />

{#if progress == 1}
  <div id="logo" in:fade={{ duration: 200 }}>
    <img id="logo-image" src={logo} alt="Fileplay" draggable="false" />
  </div>
  <div id="start" class="center-align middle-align" in:fade={{ duration: 200 }}>
    <button
      onclick={() => (progress = 2)}
      class="extra"
      style="margin-bottom: 100px;"
    >
      <i>login</i>
      <span>Start</span>
    </button>
  </div>
{:else if progress == 2}
  {#if $layout == "desktop"}
    <article
      class="border center {$height >= 630 ? 'middle' : ''}"
      style="margin: 0; width: 600px;"
    >
      <h6 style="padding: 16px 16px 0 16px;">Setup</h6>
      <div class="medium-divider"></div>
      <div style="padding: 0 16px 16px 16px;">
        <p class="bold" style="font-size: large">Device</p>
        <div
          id="content"
          class="row center-align"
          style="padding-bottom: 30px;"
        >
          <div class="field label">
            <input bind:value={$deviceParams[0].display_name} maxlength={32} />
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>Device Name</label>
          </div>

          <div class="field label suffix">
            <select
              bind:value={$deviceParams[0].type}
              style="min-width: 200px;"
            >
              {#each Object.entries(DeviceType) as [label, value]}
                <option {value}>{label}</option>
              {/each}
            </select>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>Device Type</label>
            <i>arrow_drop_down</i>
          </div>
        </div>
        <br />
        <p class="bold" style="font-size: large">User</p>
        <div id="content" style="padding-bottom: 20px;">
          <nav class="no-space center-align">
            {#if !existing}
              <button class="left-round">New</button>
              <button
                class="right-round border"
                onclick={() => {
                  existing = true;
                  setupError = "";
                }}
              >
                Connect to existing
              </button>
            {:else}
              <button
                class="left-round border"
                onclick={() => {
                  existing = false;
                  setupError = "";
                }}>New</button
              >
              <button class="right-round"> Connect to existing </button>
            {/if}
          </nav>
        </div>
        {#if !existing}
          <Username />
        {:else}
          <div>
            <p>
              Please generate a linking code on a device already connected to
              the user by going to <br />
              <strong>Settings</strong> > <strong>Devices</strong> >
              <strong>Generate linking code</strong>.
            </p>
            <div class="field label">
              <input bind:value={$linkingCode} maxlength={6} />
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label>Linking Code</label>
            </div>
          </div>
        {/if}
        <nav class="right-align" style="margin-top: 40px;">
          {#if setupError}
            <p style="color:red">{setupError}</p>
          {/if}

          <button
            disabled={actionDisabled}
            onclick={handleConfirm}
            class={actionDisabled ? "border" : ""}>Finish</button
          >
        </nav>
      </div>
    </article>
  {:else}
    <button
      onclick={() => --progress}
      class="transparent circle"
      style="margin: 8px;"
    >
      <i>arrow_back</i>
    </button>
    <h3 style="margin-top: 55px; margin-bottom: 30px; padding: 0 20px;">
      Setup
    </h3>
    <p id="header" class="bold">Device</p>

    <Button
      onclick={async () =>
        ($deviceParams[0].display_name = await openEditDialog(
          {
            title: "Device name",
            type: "string",
            placeholder: "Google Pixel 5",
          },
          $deviceParams[0].display_name,
        ))}
    >
      <div>
        <p id="title">Device name</p>
        <p
          id="subtitle"
          style={!$deviceParams[0].display_name ? "font-style: italic;" : ""}
        >
          {$deviceParams[0].display_name
            ? $deviceParams[0].display_name
            : "Google Pixel 5"}
        </p>
      </div>
    </Button>

    <Button
      onclick={async () =>
        ($deviceParams[0].type = await openEditDialog(
          { title: "Device type", type: "deviceType" },
          $deviceParams[0].type,
        ))}
    >
      <div>
        <p id="title">Device type</p>
        <p id="subtitle">
          {$deviceParams[0].type ? ValueToName($deviceParams[0].type) : ""}
        </p>
      </div>
    </Button>

    <p id="header" class="bold">User</p>

    <Button onclick={() => (existing = !existing)}>
      <div>
        <p id="title">Connect to existing</p>
        <p id="subtitle">Link your device to an existing user</p>
      </div>
      <span class="max"></span>
      <label class="switch icon">
        <input type="checkbox" checked={existing} />
        <span></span>
      </label>
    </Button>

    {#if existing}
      <Button
        onclick={async () =>
          ($linkingCode = await openEditDialog(
            {
              title: "Linking code",
              type: "string",
              placeholder: "6-digit code",
              length: 6,
            },
            $linkingCode,
          ))}
      >
        <div>
          <p id="title">Linking code</p>
          <p id="subtitle">6-digit code</p>
        </div>
      </Button>
    {:else}
      <Button
        onclick={async () =>
          ($userParams.display_name = await openEditDialog(
            {
              title: "Username",
              placeholder: "Username",
              type: "string",
            },
            $userParams.display_name,
          ))}
      >
        <div>
          <p id="title">Username</p>
          <p id="subtitle">
            {$userParams.display_name}
          </p>
        </div>
      </Button>

      <Button
        onclick={async () =>
          ($userParams.avatar_seed = await openEditDialog(
            {
              title: "Avatar",
              type: "avatar",
            },
            $userParams.avatar_seed,
          ))}
      >
        <div>
          <p id="title">Avatar</p>
          <p id="subtitle">Choose your Avatar</p>
        </div>
        <span class="max"></span>
        <img
          class="responsive"
          style="height: 50px; width: 50px; margin-right: 5px;"
          src={getDicebearUrl($userParams.avatar_seed)}
          alt="Avatar"
          draggable="false"
        />
      </Button>

      <div style="height: 35px"></div>
    {/if}

    <button
      id="finish"
      class="round extra"
      disabled={actionDisabled}
      onclick={() => handleConfirm()}
    >
      {#if setupError}
        <p>{setupError}</p>
      {:else}
        <i>start</i>
        Finish
      {/if}
    </button>
  {/if}
{/if}

<style>
  #logo {
    position: absolute;
    width: 100%;
    height: 50%;
    top: 0;

    display: flex;
    justify-content: center;
    align-items: center;
  }

  #start {
    position: absolute;
    width: 100%;
    height: 50%;
    bottom: 0;
  }

  #finish {
    position: fixed;
    z-index: 1;
    bottom: 20px;
    right: 20px;
    margin: 0;
  }

  img#logo-image {
    width: 300px;
    height: auto;
  }

  #header {
    margin: 20px 0 5px 0;
    padding: 0 20px;
    color: var(--secondary);
  }
</style>
