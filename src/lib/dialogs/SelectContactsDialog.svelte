<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Card, { PrimaryAction, Media } from "@smui/card";
  import Paper, { Content as P_Content } from "@smui/paper";
  import Button, { Label } from "@smui/button";
  import { onMount } from "svelte";
  import { files } from "$lib/components/Input.svelte";
  import { open } from "$lib/stores/SelectContactStore";
  import { contacts } from "$lib/personal";
  import { ONLINE_STATUS_TIMEOUT, getDicebearUrl } from "$lib/common";
  import dayjs from "dayjs";

  let addPendingFile: (files: FileList) => void;
  let send: (files: FileList, peerID?: string, publicKey?: string) => void;

  onMount(async () => {
    addPendingFile = (await import("$lib/peerjs/main")).addPendingFile;
    send = (await import("$lib/peerjs/send")).send;

    const messages = (await import("$lib/messages")).default_messages;
    messages.onmessage("share_rejected", (data) => {
      console.log("share_rejected", data);
      if (!(data.sid in sharing_ids)) return;
      setSendState(sharing_ids[data.sid], SendState.REJECTED);
      delete sharing_ids[data.sid];
    });

    messages.onmessage("share_accepted", (data) => {
      console.log("share_accepted", data);
      if (!(data.sid in sharing_ids)) return;
      setSendState(sharing_ids[data.sid], SendState.SENDING);
      // send files
      console.log("sending files");
      send($files, data.peerJsId, data.encryptionPublicKey);
      delete sharing_ids[data.sid];
    });
  });

  function handleSelectContactKeyDown(event: CustomEvent | KeyboardEvent) {
    if (!$open) return;
    event = event as KeyboardEvent;

    if (event.key === "Escape" || event.key === "Enter") {
      closeHandler("cancel");
    }
  }

  function closeHandler(e: CustomEvent<{ action: string }> | string) {
    let action: string;
    if (typeof e === "string") {
      action = e;
    } else {
      action = e.detail.action;
    }

    switch (action) {
      case "link":
        addPendingFile($files);
    }

    $open = false;
  }

  enum SendState {
    IDLE = "idle",
    REQUESTING = "requesting",
    REJECTED = "rejected",
    FAILED = "failed",
    CANCELED = "canceled",
    SENDING = "sending",
  }
  const sendstate: { [cid: number]: SendState } = {};
  let sharing_ids: { [sid: number]: number } = {};

  function setSendState(cid: number, state: SendState) {
    sendstate[cid] = state;
    if (
      [SendState.FAILED, SendState.REJECTED, SendState.CANCELED].includes(state)
    ) {
      setTimeout(() => (sendstate[cid] = SendState.IDLE), 1000);
    }
  }

  async function handleContactClick(cid: number) {
    switch (sendstate[cid]) {
      case SendState.REQUESTING:
        // cancel sharing request
        await fetch(`/api/share/request?cid=${cid}`, { method: "DELETE" });
        setSendState(cid, SendState.CANCELED);
        // remove sharing id
        sharing_ids = Object.fromEntries(
          Object.entries(sharing_ids).filter(([sid, _cid]) => _cid !== cid)
        );
        break;
      case SendState.SENDING:
        // cancel sharing in progress
        setSendState(cid, SendState.CANCELED);
        // remove sharing id
        sharing_ids = Object.fromEntries(
          Object.entries(sharing_ids).filter(([sid, _cid]) => _cid !== cid)
        );
        break;
      default: // IDLE, CANCELED, FAILED, REJECTED
        // request sharing to contact
        await fetch(`/api/share/request?cid=${cid}`)
          .then(async (res) => {
            if (!res.ok) throw new Error("Request failed");
            setSendState(cid, SendState.REQUESTING);
            sharing_ids[((await res.json()) as any).sid] = cid;
            console.log("Sharing Ids: ", sharing_ids);
          })
          .catch(() => {
            setSendState(cid, SendState.FAILED);
          });
        // handle error in await, update sid
        break;
    }
  }
</script>

<svelte:window on:keydown={handleSelectContactKeyDown} />

<Dialog
  bind:open={$open}
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Select contact(s)</Title>
  <Content>
    <Paper variant="unelevated">
      <P_Content>
        <div id="content">
          <!-- change to contacts -->
          {#await $contacts}
            <p>Contacts are loading...</p>
          {:then contacts}
            {#each contacts as contact}
              <!-- TODO animate all sharingstates (progress spinner around dicebear?) -->
              {#if contact.lastSeenAt > dayjs()
                  .subtract(ONLINE_STATUS_TIMEOUT, "ms")
                  .unix()}
                <Card variant="outlined">
                  <PrimaryAction
                    on:click={() => handleContactClick(contact.cid)}
                    style="padding-top: 20px;"
                  >
                    <Media
                      class="card-media-16x9"
                      aspectRatio="16x9"
                      style="background-image: url({getDicebearUrl(
                        contact.avatarSeed,
                        150
                      )}); background-size: contain;"
                    />
                    <Content
                      >{contact.displayName} : {contact.cid in sendstate
                        ? sendstate[contact.cid]
                        : "idle"}
                    </Content>
                  </PrimaryAction>
                </Card>
              {/if}
            {/each}
          {:catch}
            <p>Failed to load contacts.</p>
          {/await}
        </div>
      </P_Content>
    </Paper>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="link">
      <Label>Via Link</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  #content {
    display: flex;
    flex-basis: auto;
    flex-flow: row wrap;
    justify-content: center;
    gap: 5px;
  }

  * :global(.content-items) {
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
