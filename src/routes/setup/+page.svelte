<script lang="ts">
  import { onMount } from "svelte";
  import { nanoid } from "nanoid";

  import "beercss";
  import "material-dynamic-colors";

  import logo from "$lib/assets/Fileplay.png";

  import { DeviceType, getDicebearUrl } from "$lib/common";
  import { withDeviceType } from "$lib/personal";
  import {
    deviceParams,
    profaneUsername,
    userParams,
    setupLoading,
  } from "$lib/stores/Dialogs";
  import { publicKey_armored, setup as pgp_setup } from "$lib/openpgp";
  import { get } from "svelte/store";
  import Username from "$lib/components/Username.svelte";

  let progress = 0;
  let setupError: string;

  let actionDisabled: boolean;
  $: {
    if (!$deviceParams.displayName || !$deviceParams.type)
      actionDisabled = true;
    else if (!existing) {
      actionDisabled =
        !$userParams.displayName ||
        get(profaneUsername).profane ||
        get(profaneUsername).loading;
    } else {
      actionDisabled = !linkingCode;
    }
  }

  // edit dialog
  let current:
    | "deviceName"
    | "deviceType"
    | "username"
    | "linkingCode"
    | "avatar" = "deviceName";
  let title = "test";
  const openDialog = (
    currentU:
      | "deviceName"
      | "deviceType"
      | "username"
      | "linkingCode"
      | "avatar",
    titleU: string
  ) => {
    current = currentU;
    title = titleU;
    ui("#dialog-edit");
  };

  const ValueToName = (value: string) => {
    for (var key in DeviceType) {
      if (DeviceType.hasOwnProperty(key)) {
        // @ts-ignore
        if (DeviceType[key] == value) {
          return key;
        }
      }
    }
  };

  // options
  let existing = false;
  let linkingCode = "";

  // setup (confirm)
  async function handleResponseError(res: Response) {
    const json_ = (await res.json()) as any;
    if (json_) {
      setupError = json_.message;
    } else {
      setupError = res.statusText;
    }
  }

  async function handleConfirm() {
    // setup device if not already done so
    let storedDeviceParams = localStorage.getItem("deviceParams");
    if (
      storedDeviceParams &&
      storedDeviceParams !== JSON.stringify($deviceParams)
    ) {
      storedDeviceParams = null;
      // delete old user with still present cookie auth
      await fetch("/api/devices", {
        method: "DELETE",
      });
    }
    if (!storedDeviceParams) {
      $deviceParams.encryptionPublicKey = publicKey_armored;

      const res = await fetch("/api/setup/device", {
        method: "POST",
        body: JSON.stringify($deviceParams),
      });
      if (String(res.status).charAt(0) !== "2") {
        handleResponseError(res);
        return;
      }
      localStorage.setItem("deviceParams", JSON.stringify($deviceParams));
    }
    if (existing) {
      // link to existing user
      const res2 = await fetch("/api/devices/link", {
        method: "POST",
        body: JSON.stringify({ code: linkingCode }),
      });
      if (String(res2.status).charAt(0) !== "2") {
        handleResponseError(res2);
        return;
      }
    } else {
      // create new user
      const res = await fetch("/api/setup/user", {
        method: "POST",
        body: JSON.stringify($userParams),
      });
      if (String(res.status).charAt(0) !== "2") {
        handleResponseError(res);
        return;
      }
    }

    localStorage.removeItem("deviceParams");
    localStorage.setItem("loggedIn", "true");

    window.location.href = "/";
  }

  onMount(() => {
    pgp_setup();
  });
</script>

<dialog
  id="dialog-edit"
  style={current == "deviceType"
    ? "min-height: 250px;"
    : current == "avatar"
    ? "min-height: 240px;"
    : ""}
>
  <p style="font-size: large; margin-bottom: 2px;">{title}</p>
  <div class="field">
    {#if current == "deviceName"}
      <input
        bind:value={$deviceParams.displayName}
        placeholder="Google Pixel 5"
      />
    {:else if current == "deviceType"}
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
    {:else if current == "linkingCode"}
      <input
        bind:value={linkingCode}
        inputmode="numeric"
        maxlength={6}
        placeholder="6-digit code"
      />
    {:else if current == "avatar"}
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
      <input bind:value={$userParams.displayName} placeholder={title} />
    {/if}
  </div>
</dialog>

{#if progress == 0}
  <div id="logo">
    <img id="logo-image" src={logo} alt="Fileplay" />
  </div>
{/if}
{#if progress == 0}
  <div id="start">
    <button on:click={() => (progress = 1)} class="extra center">
      <i>login</i>
      <span>Start</span>
    </button>
  </div>
{:else if progress == 1}
  <article class="l m border center middle" style="width: 600px">
    <h6 id="title" style="padding: 16px 16px 0px 16px;">Setup</h6>
    <div class="medium-divider" />
    <div style="padding: 0px 16px 16px 16px;">
      <p class="bold" style="font-size: large">Device</p>
      <div id="content" class="row center-align" style="padding-bottom: 30px;">
        <div class="field label">
          <input
            bind:value={$deviceParams.displayName}
            disabled={$setupLoading}
            maxlength={32}
          />
          <!-- svelte-ignore a11y-label-has-associated-control-->
          <label>Device Name</label>
        </div>

        <div class="field label suffix">
          <select
            class="active"
            bind:value={$deviceParams.type}
            disabled={$setupLoading}
            style="min-width: 200px;"
          >
            {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
              <option value={type}>{name}</option>
            {/each}
          </select>
          <!-- svelte-ignore a11y-label-has-associated-control-->
          <label class="active">Device Type</label>
          <i>arrow_drop_down</i>
        </div>
      </div>
      <br />
      <p class="bold" style="font-size: large">User</p>
      <div id="content" style="padding-bottom: 20px;">
        <nav class="no-space center-align">
          {#if !existing}
            <button class="left-round" disabled={$setupLoading}>New</button>
            <button
              class="right-round border"
              disabled={$setupLoading}
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
              disabled={$setupLoading}
              on:click={() => {
                existing = false;
                setupError = "";
              }}>New</button
            >
            <button class="right-round" disabled={$setupLoading}>
              Connect to existing
            </button>
          {/if}
        </nav>
      </div>
      {#if !existing}
        <Username />
      {:else}
        <div>
          <p>
            Please generate a linking code on a device already connected to the user by going to <br />
            <strong>Settings</strong> > <strong>Devices</strong> >
            <strong>Generate linking code</strong>.
          </p>
          <div class="field label">
            <input
              bind:value={linkingCode}
              disabled={$setupLoading}
              maxlength={6}
            />
            <!-- svelte-ignore a11y-label-has-associated-control-->
            <label>Linking Code</label>
          </div>
        </div>
      {/if}
      <nav class="right-align" style="margin-top: 40px;">
        {#if actionDisabled}
          <button disabled={true} on:click={handleConfirm} class="border"
            >Finish</button
          >
        {:else}
          <button disabled={false} on:click={handleConfirm}>Finish</button>
        {/if}

        {#if setupError}
          <p style="color:red">{setupError}</p>
        {/if}
      </nav>
    </div>
  </article>

  <div class="s">
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

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => openDialog("deviceName", "Device name")}
    >
      <div class="column">
        <p style="font-size: large; margin-bottom: 2px;">Device name</p>
        <p
          style="font-size: small; margin-top: 0; {!$deviceParams.displayName
            ? 'font-style: italic;'
            : ''}"
        >
          {$deviceParams.displayName
            ? $deviceParams.displayName
            : "Google Pixel 5"}
        </p>
      </div>
    </a>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => openDialog("deviceType", "Device type")}
    >
      <div class="column">
        <p style="font-size: large; margin-bottom: 2px;">Device type</p>
        {#if $deviceParams.type}
          <p style="font-size: small; margin-top: 0;">
            {ValueToName($deviceParams.type)}
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

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => (existing = !existing)}
    >
      <div class="column">
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
      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openDialog("linkingCode", "Linking code")}
      >
        <div class="column">
          <p style="font-size: large; margin-bottom: 2px;">Linking code</p>
          <p style="font-size: small; margin-top: 0;">6-digit code</p>
        </div>
      </a>
    {:else}
      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openDialog("username", "Username")}
      >
        <div class="column">
          <p style="font-size: large; margin-bottom: 2px;">Username</p>
          {#if $userParams.displayName}
            <p style="font-size: small; margin-top: 0;">
              {$userParams.displayName}
            </p>
          {/if}
        </div>
      </a>

      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openDialog("avatar", "Avatar")}
      >
        <div class="column">
          <p style="font-size: large; margin-bottom: 2px;">Avatar</p>
          <p style="font-size: small; margin-top: 0;">Choose your Avatar</p>
        </div>
        <span class="max" />
        <img
          class="responsive"
          style="height: auto;"
          src={getDicebearUrl($userParams.avatarSeed, 150)}
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
  </div>
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

  img#avatar-image {
    width: 7em;
    aspect-ratio: 1/1;
  }
</style>
