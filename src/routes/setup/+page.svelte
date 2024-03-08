<script lang="ts">
  import type { HttpResponse } from "@capacitor/core";
  import { get } from "svelte/store";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";

  import logo from "$lib/assets/Fileplay.svg";
  import Username from "$lib/components/Username.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";

  import { apiClient } from "$lib/api/client";
  import { DeviceType, getDicebearUrl } from "$lib/lib/common";
  import { withDeviceType } from "$lib/lib/fetchers";
  import {
    deviceParams,
    userParams,
    profaneUsername,
    openEditDialog,
    linkingCode,
    width,
    layout,
  } from "$lib/lib/UI";
  import { ValueToName } from "$lib/lib/utils";

  let progress = 0;
  let setupError: string;

  let actionDisabled = true;
  $: {
    if (!$deviceParams[0].display_name || !$deviceParams[0].type)
      actionDisabled = true;
    else if (!existing) {
      actionDisabled =
        !$userParams.display_name ||
        $profaneUsername.profane ||
        $profaneUsername.loading;
    } else {
      actionDisabled = !$linkingCode;
    }
  }

  // options
  let existing = false;

  // setup (confirm)
  const handleResponseError = async (res: HttpResponse) => {
    const json_ = JSON.parse(res.data);
    if (json_) {
      setupError = json_.message;
    } else {
      setupError = res.status.toString();
    }
  };

  const handleConfirm = async () => {
    // setup device if not already done so
    let storedDeviceParams = localStorage.getItem("deviceParams");
    if (
      storedDeviceParams &&
      storedDeviceParams !== JSON.stringify($deviceParams)
    ) {
      storedDeviceParams = null;
      // delete old user with still present cookie auth
      await apiClient("http").deleteAccount(true, false);
    }
    if (!storedDeviceParams) {
      const object = {
        display_name: $deviceParams[0].display_name,
        type: $deviceParams[0].type,
      };

      const res = await apiClient("http").setupDevice(object);
      if (Array.from(res.status.toString())[0] != "2") {
        return handleResponseError(res);
      }
      localStorage.setItem("deviceParams", JSON.stringify($deviceParams));
    }
    if (existing) {
      // link to existing user
      const res2 = await apiClient("http").setupDevice($linkingCode);
      if (Array.from(res2.status.toString())[0] != "2") {
        return handleResponseError(res2);
      }
    } else {
      const object = {
        display_name: $userParams.display_name,
        avatar_seed: $userParams.avatar_seed,
      };

      // create new user
      const res = await apiClient("http").setupUser(object);
      if (Array.from(res.status.toString())[0] != "2") {
        return handleResponseError(res);
      }
    }

    localStorage.removeItem("deviceParams");
    localStorage.setItem("loggedIn", "true");

    window.location.href = "/";
  };

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";
  $: $layout = $width < 840 ? "mobile" : "desktop";
</script>

<svelte:window bind:innerWidth={$width} />

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
</svelte:head>

<Edit />

{#if progress == 0}
  <div id="logo">
    <img id="logo-image" src={logo} alt="Fileplay" />
  </div>
  <div id="start">
    <button on:click={() => (progress = 1)} class="extra center">
      <i>login</i>
      <span>Start</span>
    </button>
  </div>
{:else if progress == 1}
  {#if $layout == "desktop"}
    <article class="border center middle" style="width: 600px">
      <h6 id="title" style="padding: 16px 16px 0px 16px;">Setup</h6>
      <div class="medium-divider" />
      <div style="padding: 0px 16px 16px 16px;">
        <p class="bold" style="font-size: large">Device</p>
        <div
          id="content"
          class="row center-align"
          style="padding-bottom: 30px;"
        >
          <div class="field label">
            <input bind:value={$deviceParams[0].display_name} maxlength={32} />
            <!-- svelte-ignore a11y-label-has-associated-control-->
            <label>Device Name</label>
          </div>

          <div class="field label suffix">
            <select
              bind:value={$deviceParams[0].type}
              style="min-width: 200px;"
            >
              {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
                <option value={type}>{name}</option>
              {/each}
            </select>
            <!-- svelte-ignore a11y-label-has-associated-control -->
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
                on:click={() => {
                  existing = true;
                  setupError = "";
                }}
              >
                Connect to existing
              </button>
            {:else}
              <button
                class="left-round border"
                on:click={() => {
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
              <!-- svelte-ignore a11y-label-has-associated-control-->
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
            on:click={handleConfirm}
            class={actionDisabled ? "border" : ""}>Finish</button
          >
        </nav>
      </div>
    </article>
  {:else}
    <button
      on:click={() => (progress -= 1)}
      class="transparent circle"
      style="margin: 8px;"
    >
      <i>arrow_back</i>
    </button>
    <h3
      style="margin-top: 55px; margin-bottom: 30px; padding: 0px 20px 0px 20px;"
    >
      Setup
    </h3>
    <p
      class="bold"
      style="color: var(--secondary); margin: 20px 0px 5px 0px; padding: 0px 20px 0px 20px;"
    >
      Device
    </p>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => openEditDialog("deviceName", 0)}
    >
      <div>
        <p style="font-size: large; margin-bottom: 2px;">Device name</p>
        <p
          style="font-size: small; margin-top: 0; {!$deviceParams[0]
            .display_name
            ? 'font-style: italic;'
            : ''}"
        >
          {$deviceParams[0].display_name
            ? $deviceParams[0].display_name
            : "Google Pixel 5"}
        </p>
      </div>
    </a>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => openEditDialog("deviceType", 0)}
    >
      <div>
        <p style="font-size: large; margin-bottom: 2px;">Device type</p>
        {#if $deviceParams[0].type}
          <p style="font-size: small; margin-top: 0;">
            {ValueToName($deviceParams[0].type)}
          </p>
        {/if}
      </div>
    </a>

    <p
      class="bold"
      style="color: var(--secondary); margin: 20px 0px 5px 0px; padding: 0px 20px 0px 20px;"
    >
      User
    </p>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => (existing = !existing)}
    >
      <div>
        <p style="font-size: large; margin-bottom: 2px;">Connect to existing</p>
        <p style="font-size: small; margin-top: 0;">
          Link your device to an existing user
        </p>
      </div>
      <span class="max" />
      <label class="switch icon">
        <input type="checkbox" checked={existing} />
        <span />
      </label>
    </a>

    {#if existing}
      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openEditDialog("linkingCode")}
      >
        <div>
          <p style="font-size: large; margin-bottom: 2px;">Linking code</p>
          <p style="font-size: small; margin-top: 0;">6-digit code</p>
        </div>
      </a>
    {:else}
      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openEditDialog("username")}
      >
        <div>
          <p style="font-size: large; margin-bottom: 2px;">Username</p>
          {#if $userParams.display_name}
            <p style="font-size: small; margin-top: 0;">
              {$userParams.display_name}
            </p>
          {/if}
        </div>
      </a>

      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openEditDialog("avatar")}
      >
        <div>
          <p style="font-size: large; margin-bottom: 2px;">Avatar</p>
          <p style="font-size: small; margin-top: 0;">Choose your Avatar</p>
        </div>
        <span class="max" />
        <img
          class="responsive"
          style="height: 50px; width: 50px; margin-right: 5px;"
          src={getDicebearUrl($userParams.avatar_seed, 150)}
          alt="Avatar"
        />
      </a>
    {/if}

    <button
      id="finish"
      class="round extra"
      disabled={actionDisabled}
      on:click={() => handleConfirm()}
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
    bottom: 20px;
    right: 20px;
    margin: 0;
  }

  img#logo-image {
    width: 300px;
    height: auto;
  }
</style>
