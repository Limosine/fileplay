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
      // testing:
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
