<script lang="ts">
  import { get, type Readable } from "svelte/store";
  import { browser } from "$app/environment";
  import { onMount, onDestroy } from "svelte";
  import { getContent, updatePeerJS_ID, withDeviceType } from "$lib/personal";

  import {
    deviceParams,
    userParams,
    profaneUsername,
    setupLoading,
  } from "$lib/stores/Dialogs";
  import Username from "$lib/components/Username.svelte";
  import { publicKey_armored } from "$lib/openpgp";
  import { DeviceType } from "$lib/common";

  let socketStore: Readable<any>;
  let unsubscribeSocketStore = () => {};

  let open: boolean;

  let newUser = true;

  let linkingCode = "";

  let actionDisabled: boolean;
  $: {
    if (!$deviceParams.displayName || !$deviceParams.type)
      actionDisabled = true;
    else if (newUser) {
      actionDisabled =
        !$userParams.displayName ||
        get(profaneUsername).profane ||
        get(profaneUsername).loading;
    } else {
      actionDisabled = !linkingCode;
    }
  }

  let setupError: string;

  async function handleSetupKeyDown(event: CustomEvent | KeyboardEvent) {
    if (!open) return;
    event = event as KeyboardEvent;
    if (event.key === "Enter" && !actionDisabled) {
      await handleConfirm();
    }
  }

  async function handleResponseError(res: Response) {
    setupLoading.set(false);
    const json_ = (await res.json()) as any;
    if (json_) {
      setupError = json_.message;
    } else {
      setupError = res.statusText;
    }
  }

  async function handleConfirm() {
    if (actionDisabled) return;
    setupLoading.set(true);
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
    if (newUser) {
      // create new user
      const res = await fetch("/api/setup/user", {
        method: "POST",
        body: JSON.stringify($userParams),
      });
      if (String(res.status).charAt(0) !== "2") {
        handleResponseError(res);
        return;
      }
    } else {
      // link to existing user
      const res2 = await fetch("/api/devices/link", {
        method: "POST",
        body: JSON.stringify({ code: linkingCode }),
      });
      if (String(res2.status).charAt(0) !== "2") {
        handleResponseError(res2);
        return;
      }
    }

    localStorage.removeItem("deviceParams");
    localStorage.setItem("loggedIn", "true");
    ui("#dialog-setup");
    setupLoading.set(false);

    getContent();
    updatePeerJS_ID();
    socketStore = (await import("$lib/websocket")).socketStore;
    unsubscribeSocketStore = socketStore.subscribe(() => {});
  }

  onMount(async () => {
    if (!browser) return;
    // if device is not set up, open dialog
    if (!localStorage.getItem("loggedIn")) {
      ui("#dialog-setup");
      // if setup was partially completed, load values
      const storedDeviceParams = localStorage.getItem("deviceParams");
      if (storedDeviceParams) {
        $deviceParams = JSON.parse(storedDeviceParams);
      }
    } else {
      getContent();
      socketStore = (await import("$lib/websocket")).socketStore;
      unsubscribeSocketStore = socketStore.subscribe(() => {});
    }
  });

  onDestroy(() => {
    if (socketStore) unsubscribeSocketStore();
  });
</script>

<svelte:window on:keydown={handleSetupKeyDown} />

<dialog
  id="dialog-setup"
  class="modal"
  aria-labelledby="title"
  aria-describedby="content"
  style="padding: 0;"
>
  {#if $setupLoading}
    <!-- indeterminate progress -->
  {/if}
  <h6 id="title" style="padding: 16px 16px 0px 16px;">Setup</h6>
  <div class="medium-divider"></div>
  <div style="padding: 0px 16px 16px 16px;">
    <p class="bold" style="font-size: large">Device</p>
    <div id="content" style="padding-bottom: 30px;">
      <div id="content-device" class="row">
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
    </div>
    <br />
    <p class="bold" style="font-size: large">User</p>
    <div id="content" style="padding-bottom: 20px;">
      <nav class="no-space center-align">
        {#if newUser}
          <button class="left-round" disabled={$setupLoading}>New</button>
          <button
            class="right-round border"
            disabled={$setupLoading}
            on:click={() => {
              newUser = false;
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
              newUser = true;
              setupError = "";
            }}>New</button
          >
          <button class="right-round" disabled={$setupLoading}>
            Connect to existing
          </button>
        {/if}
      </nav>
    </div>
    {#if newUser}
      <Username />
    {:else}
      <div>
        <p>
          Please generate a linking code on a device already <br />
          connected to the user by going to <br />
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
</dialog>

<style>
  /* .actions {
    display: flex;
    flex-flow: row-reverse;
    justify-content: space-between;
    align-items: center;
  }
  #content {
    margin-bottom: 1.6em;
    display: flex;
    flex-flow: row;
    justify-content: center;
    gap: 10px;
  }

  #content-device {
    display: flex;
    flex-flow: row;
    gap: 7px;
  } */
</style>
