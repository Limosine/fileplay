<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";

  import { getDicebearUrl } from "$lib/lib/common";
  import type { IContact } from "$lib/lib/fetchers";
  import { sendState } from "$lib/lib/sendstate";
  import { contactId, contacts, deviceId, sendDialog } from "$lib/lib/UI";
  import { cancelFiletransfer } from "$lib/sharing/main";

  let contact: IContact | undefined;
  let device: IContact["devices"][0] | undefined;

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

  const loadData = (cid: number, did: number) => {
    if (cid === undefined || did === undefined) return;
    contact = $contacts.find((con) => con.cid === cid);

    if (contact === undefined) return;
    device = contact.devices.find((dev) => dev.did === did);
  };

  const cancel = () => {
    cancelFiletransfer(contact);
    ui("#dialog-send");
  };

  onDestroy(() => {
    stop();
  });

  $: {
    if ($contactId === undefined || $deviceId === undefined) {
      stop();
    } else {
      stop();
      start();

      loadData($contactId, $deviceId);
    }
  }
</script>

<dialog id="dialog-send" bind:this={$sendDialog}>
  {#if contact !== undefined && device !== undefined}
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
    <p class="center-align" style="margin-top: 32px;">
      {get(sendState)[contact.cid] + finalString}
    </p>
    <nav class="center-align">
      <button class="border error" style="border: 0;" on:click={() => cancel()}>
        Cancel
      </button>
    </nav>
  {/if}
</dialog>
