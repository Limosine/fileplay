<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Card, { PrimaryAction } from "@smui/card";
  import Paper, { Content as P_Content } from "@smui/paper";
  import Button, { Label } from "@smui/button";
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { files } from "$lib/components/Input.svelte";
  import Textfield from "@smui/textfield";
  import { open } from "$lib/stores/SelectContactStore";
  import { publicKey_armored } from "$lib/openpgp";

  import { contacts_loaded, getContacts, type IContact } from "$lib/personal";
  import { onDestroy } from "svelte";
  import { getDicebearUrl } from "$lib/common";

  let contacts: Promise<IContact[]> | IContact[] | undefined;

  const selected: number[] = [];

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;

    if (event.key === "Escape") {
      closeHandler("cancel");
    } else if (event.key === "Enter") {
      closeHandler("confirm");
    }
  }

  function closeHandler(e: CustomEvent<{ action: string }> | string) {
    // let action: string;
    // if (typeof e === "string") {
    //   action = e;
    // } else {
    //   action = e.detail.action;
    // }
    // switch (action) {
    //   case "link":
    //     addPendingFile($files);
    //   case "confirm":
    //     multiSend($files, reciever_uuids, [publicKey_armored]);
    //     fetch("/api/sharing/selection", {
    //       method: "POST",
    //       body: JSON.stringify({
    //         senderName: "unknown",
    //         reciever_uuids
    //       })
    //     })
    // }
    // $open = false;
  }

  async function select(contact: IContact) {
    if (selected.includes(contact.cid)) return; // already selected

    selected.push(contact.cid);
    const res = await fetch(`/api/share/request?cid=${contact.cid}`, {
      method: "GET",
    });

    if (!res.ok) {
      // remove selected state
      selected.splice(selected.indexOf(contact.cid), 1);
      // maybe failed animation
    }

    // maybe use sent/failed for some fancy animations
  }

  async function deselect(contact: IContact) {
    if (!selected.includes(contact.cid)) return; // already deselected

    selected.splice(selected.indexOf(contact.cid), 1);
    await fetch(`/api/share/request?cid=${contact.cid}`, {
      method: "DELETE",
    });
    // fail silently, since a rogue sharing accept can just be ignored
  }

  let contacts_interval: any;

  function startRefresh() {
    contacts_interval = setInterval(async () => {
      if ($open) contacts = await getContacts();
    }, 5000);
  }

  function stopRefresh() {
    clearInterval(contacts_interval);
  }

  onMount(async () => {
    contacts = getContacts();
    startRefresh();
  });

  onDestroy(stopRefresh);
</script>

<svelte:window on:keydown={handleKeyDown} />

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
          {#if contacts}
            {#await contacts}
              <p>Loading contacts...</p>
            {:then contacts}
              {#each contacts as contact}
                <Card class={selected.includes(contact.cid) ? "selected" : ""}>
                  <PrimaryAction
                    on:click={() => {
                      if (selected.includes(contact.cid)) {
                        deselect(contact);
                      } else {
                        select(contact);
                      }
                    }}
                    class="content-items"
                  >
                    <img
                      src={getDicebearUrl(contact.avatarSeed, 70)}
                      alt={`${contact.displayName}'s avatar image`}
                    />
                    {contact.displayName}
                  </PrimaryAction>
                </Card>
              {/each}
            {:catch}
              <p>Failed to load contacts.</p>
            {/await}
          {/if}
        </div>
      </P_Content>
    </Paper>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
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

  #content-uuid {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
  }

  #row {
    display: flex;
    flex-flow: row;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  * :global(.content-items) {
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
