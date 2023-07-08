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
  import { mappedIDs, sendState } from "$lib/stores/state";
  import CircularProgress from "@smui/circular-progress";
  import { writable } from "svelte/store";

  let pending_filetransfers = writable<{
    filetransfer_id: string;
    encrypted: string;
    completed: boolean;
    files: {
        file: string[];
        chunks: number;
        file_name: string;
        file_id: string;
    }[];
    cid?: string | undefined;
  }[]>([]);
  let addPendingFile: (files: FileList) => {};
  let send: (files: FileList, cid?: string, peerID?: string, publicKey?: string) => {};

  onMount(async () => {
    addPendingFile = (await import("$lib/peerjs/main")).addPendingFile;
    send = (await import("$lib/peerjs/send")).send;
    pending_filetransfers = (await import("$lib/peerjs/common"))
      .pending_filetransfers;

    const messages = (await import("$lib/messages")).default_messages;
    messages.onmessage("share_rejected", (data) => {
      console.log("share_rejected", data);
      if (!(data.sid in sharing_ids)) return;

      const cid = sharing_ids[data.sid];
      setSendState(cid, SendState.REJECTED);
      mappedIDs.deletePair(cid);
      delete sharing_ids[data.sid];
    });

    messages.onmessage("share_accepted", (data) => {
      console.log("share_accepted", data);
      if (!(data.sid in sharing_ids)) return;

      const cid = sharing_ids[data.sid];
      setSendState(sharing_ids[data.sid], SendState.SENDING);
      // send files
      console.log("sending files");
      mappedIDs.addPair(data.peerJsId, cid);
      console.log(`Adding pair: \npeerID: ${data.peerJsId} \ncid: ${cid}`);
      send($files, cid.toString(), data.peerJsId, data.encryptionPublicKey);

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
  let sharing_ids: { [sid: number]: number } = {};

  function setSendState(cid: number, state: SendState) {
    $sendState[cid] = state;
    if (
      [SendState.FAILED, SendState.REJECTED, SendState.CANCELED].includes(state)
    ) {
      setTimeout(() => ($sendState[cid] = SendState.IDLE), 1000);
    }
  }

  async function handleContactClick(cid: number) {
    switch ($sendState[cid]) {
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

  let progress = writable<{ [cid: string]: number }>({});
  let progress_styles = writable<{ [cid: string]: { class: string, indeterminate: boolean }}>({});
  $: {
    if (Object.keys($sendState).length != 0) {
      for (let [key, value] of Object.entries($sendState)) {
        switch(value) {
          case SendState.REQUESTING:
            $progress_styles[key] = {
              class: "progress-yellow",
              indeterminate: true,
            };
            break;
          case SendState.IDLE:
            $progress[key] = 0;
            $progress_styles[key] = {
              class: "",
              indeterminate: false,
            };
            break;
          case SendState.SENDING:
            $progress_styles[key] = {
              class: ($progress[key] == 1) ? "progress-green" : "",
              indeterminate: false,
            };
            break;
          default:
            $progress[key] = 1;
            $progress_styles[key] = {
              class: "progress-red",
              indeterminate: true,
            };
            break;
        }
      }
    }
  }
  $: {
    if ($pending_filetransfers.length != 0) {
      $pending_filetransfers.forEach((pending_filetransfer) => {
        if (pending_filetransfer.cid !== undefined) {
          let sent = 0;
          let total = 0;

          pending_filetransfer.files.forEach((file) => {
            sent = sent + file.chunks;
            total = total + file.file.length;
          });

          $progress[pending_filetransfer.cid] = sent / total;
        }
      });
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
                  >
                    <Content>
                      <div style="text-align: center;">
                        <CircularProgress
                          style="height: 120px; width: 120px;
                          background-image: url({getDicebearUrl(
                            contact.avatarSeed,
                            60
                          )});
                          background-size: 50% 50%; background-repeat: no-repeat;
                          background-position: center;"
                          class={$progress_styles[contact.cid].class}
                          progress={($progress[contact.cid] === undefined) ? 0 : $progress[contact.cid]}
                          indeterminate={$progress_styles[contact.cid].indeterminate}
                        />
                      </div>
                      <p>
                        {contact.displayName} : {contact.cid in $sendState
                          ? $sendState[contact.cid]
                          : "idle"}
                      </p>
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
