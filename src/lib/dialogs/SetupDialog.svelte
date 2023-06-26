<script lang="ts">
  import Dialog, { Title, Content } from "@smui/dialog";
  import Button, { Group, Label } from "@smui/button";
  import Textfield from "@smui/textfield";
  import Select, { Option } from "@smui/select";
  import LinearProgress from "@smui/linear-progress";

  import { get, type Readable } from "svelte/store";
  import { browser } from "$app/environment";
  import { onDestroy, onMount } from "svelte";
  import { getContent, updatePeerJS_ID } from "$lib/personal";
  import { DeviceType } from "$lib/common";
  import { set } from "idb-keyval";

  import {
    deviceParams,
    userParams,
    profaneUsername,
    setupLoading,
  } from "$lib/stores/Dialogs";
  import Username from "$lib/components/Username.svelte";
  import { publicKey_armored } from "$lib/openpgp";
  import Device from "$lib/components/Device.svelte";

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

  function handleSetupKeyDown(event: CustomEvent | KeyboardEvent) {
    if (!open) return;
    event = event as KeyboardEvent;
    if (event.key === "Enter" && !actionDisabled) {
      handleConfirm();
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
    let keepAliveCode: string;
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
      keepAliveCode = (await res.json() as any).keepAliveCode;
      localStorage.setItem("deviceParams", JSON.stringify($deviceParams));
    }
    switch (newUser) {
      case true:
        // create new user
        const res = await fetch("/api/setup/user", {
          method: "POST",
          body: JSON.stringify($userParams),
        });
        if (String(res.status).charAt(0) !== "2") {
          handleResponseError(res);
          return;
        }
        break;
      case false:
        // link to existing user
        const res2 = await fetch("/api/devices/link", {
          method: "POST",
          body: JSON.stringify({ code: linkingCode }),
        });
        if (String(res2.status).charAt(0) !== "2") {
          handleResponseError(res2);
          return;
        }
        break;
    }

    localStorage.removeItem("deviceParams");
    localStorage.setItem("loggedIn", "true");
    open = false;
    setupLoading.set(false);

    getContent();
    updatePeerJS_ID();
    socketStore = (await import("$lib/websocket")).socketStore;
    unsubscribeSocketStore = socketStore.subscribe(() => {});

    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: "register_push", keepAliveCode });
    });
  }

  onMount(async () => {
    if (!browser) return;
    // if device is not set up, open dialog
    if (!localStorage.getItem("loggedIn")) {
      open = true;
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

<Dialog
  bind:open
  scrimClickAction=""
  escapeKeyAction=""
  aria-labelledby="title"
  aria-describedby="content"
>
  {#if $setupLoading}
    <LinearProgress indeterminate />
  {/if}
  <Title id="title">Setup</Title>
  <Content>
    <h6>Device</h6>
    <div id="content">
      <Device />
    </div>
    <br />
    <h6>User</h6>
    <div id="content">
      <Group variant="outlined">
        {#if newUser}
          <Button variant="unelevated" bind:disabled={$setupLoading}>
            <Label>New</Label>
          </Button>
          <Button
            bind:disabled={$setupLoading}
            on:click={() => {
              newUser = false;
              setupError = "";
            }}
            variant="outlined"
          >
            <Label>Connect to existing</Label>
          </Button>
        {:else}
          <Button
            bind:disabled={$setupLoading}
            on:click={() => {
              newUser = true;
              setupError = "";
            }}
            variant="outlined"
          >
            <Label>New</Label>
          </Button>
          <Button variant="unelevated" bind:disabled={$setupLoading}>
            <Label>Connect to existing</Label>
          </Button>
        {/if}
      </Group>
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
        <Textfield
          label="Linking Code"
          input$maxlength={6}
          bind:value={linkingCode}
          bind:disabled={$setupLoading}
          input$placeholder="6-digit code"
        />
      </div>
    {/if}
    <div class="actions">
      <Button bind:disabled={actionDisabled} on:click={handleConfirm}>
        <Label>Finish</Label>
      </Button>
      {#if setupError}
        <p style="color:red">{setupError}</p>
      {/if}
    </div>
  </Content>
</Dialog>

<style>
  .actions {
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
</style>
