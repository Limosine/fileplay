<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";

  import { getDicebearUrl } from "$lib/lib/common";
  import type { IContact } from "$lib/lib/fetchers";
  import { SendState, sendState } from "$lib/lib/sendstate";
  import {
    sendProperties,
    contacts,
    dialogMode,
    closeDialog,
  } from "$lib/lib/UI";
  import { cancelFiletransfer } from "$lib/sharing/main";

  let contact: IContact | undefined;
  let devices: IContact["devices"] | undefined;

  let state = "";
  let interval: NodeJS.Timeout;
  let finalString = "";
  let counter = 0;

  const start = () => {
    interval = setInterval(() => {
      if (counter >= 3) {
        finalString = "";
        counter = 0;
      } else {
        finalString = finalString.concat(".");
        counter++;
      }
    }, 500);
  };

  const stop = () => {
    if (interval !== undefined) {
      clearInterval(interval);
    }
  };

  const loadData = (cid: number) => {
    contact = $contacts.find((con) => con.cid === cid);

    if (contact !== undefined) devices = contact.devices;
  };

  const cancel = () => {
    cancelFiletransfer(contact);
    if ($dialogMode == "send") closeDialog();
  };

  const updateState = (
    finalString: string,
    cid?: number,
    stateParam?: SendState,
  ) => {
    if (cid !== undefined) {
      if (stateParam === undefined || stateParam == SendState.IDLE) {
        if ($dialogMode == "send") closeDialog();
      } else {
        if (
          stateParam == SendState.NOTIFYING ||
          stateParam == SendState.REQUESTING ||
          stateParam == SendState.SENDING
        ) {
          state = stateParam + finalString;
        } else {
          state = stateParam;
        }
      }
    }
  };

  onDestroy(() => {
    stop();
  });

  $: {
    if ($sendProperties.cid === undefined) {
      stop();
    } else {
      stop();
      start();

      loadData($sendProperties.cid);
    }
  }

  $: {
    if ($sendProperties.cid !== undefined)
      updateState(
        finalString,
        $sendProperties.cid,
        get(sendState)[$sendProperties.cid],
      );
  }
</script>

{#if contact !== undefined}
  <p style="font-size: large; margin-bottom: 10px;">Sending files</p>
  <i class="center">arrow_downward</i>

  <article class="tertiary">
    <div class="row">
      <img
        class="circle medium"
        src={getDicebearUrl(contact.avatar_seed, 100)}
        alt="Avatar"
      />
      <div class="max">
        <p class="large-text">{contact.display_name}</p>
      </div>
    </div>
  </article>

  <p class="center-align large-text" style="margin-top: 34px;">
    {state}
  </p>

  <nav class="center-align" style="margin-top: 18;">
    <button class="border error" style="border: 0;" on:click={() => cancel()}>
      Cancel
    </button>
  </nav>
{/if}
