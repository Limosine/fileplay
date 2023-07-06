<script lang="ts">
  import Drawer, { Content, Header, Title, Subtitle, Scrim } from "@smui/drawer";

  import IconButton from "@smui/icon-button";
  import Card, {
    ActionButtons,
    ActionIcons,
    Actions,
    PrimaryAction,
    Content as C_Content,
  } from "@smui/card";
  import Button, { Label } from "@smui/button";
  import {
    addNotification,
    deleteNotification,
    notifications,
  } from "$lib/stores/Dialogs";
  import type { INotification } from "$lib/stores/Dialogs";
  import { onMount } from "svelte";
  import { SHARING_TIMEOUT } from "$lib/common";
  import { contacts, updateContacts } from "$lib/personal";

  import { AutoAdjust } from "@smui/top-app-bar";

  import { topAppBar } from "./TopAppBar.svelte";
  import Tooltip, { Wrapper } from "@smui/tooltip";

  import { add_open } from "$lib/stores/Dialogs";

  import { drawer_open as open, drawer } from "$lib/stores/Dialogs";
  import { page } from "$app/stores";

  let width: number;

  async function handleNotificationClick(n: INotification, action: string) {
    deleteNotification(n.tag);
    if (action == "close") return null;
    const messages = (await import("$lib/messages")).default_messages;
    messages.dispatchNotificationClick({
      type: action,
      data: n.data,
    });
  }

  onMount(async () => {
    const messages = (await import("$lib/messages")).default_messages;
    messages.onmessage("sharing_request", (data) => {
      console.log("sharing_request", data);
      addNotification({
        title: "Sharing Request",
        body: `${data.sender} wants to share files with you. Click to accept.`,
        actions: [
          {
            title: "Accept",
            action: "share_accept",
          },
          {
            title: "Reject",
            action: "share_reject",
          },
        ],
        tag: data.tag,
        data: data,
      });
      setTimeout(() => {
        deleteNotification(data.tag);
      }, SHARING_TIMEOUT);
    });
    messages.onmessage("sharing_cancel", (data) => {
      console.log("sharing_cancel", data);
      deleteNotification(data.tag);
    });
  });

  async function deleteContact(cid: number) {
    await fetch(`/api/contacts?cid=${cid}`, {
      method: "DELETE",
    });
    await updateContacts();
  }
</script>

<svelte:window bind:outerWidth={width} />

<Drawer
  class="mdc-top-app-bar--fixed-adjust"
  variant="modal"
  bind:open={$open}
>
  <Header>
    {#if $drawer == "Notification"}
      <Title>Notifications</Title>
    {:else}
      <Title>Contacts</Title>
      <Subtitle>Manage your contacts</Subtitle>
      <div class="button-box">
        <Button
          variant="unelevated"
          color="primary"
          style="width: 100%;"
          on:click={() => ($add_open = !$add_open)}
        >
          Add contact
        </Button>
        <Button
          class="material-icons"
          variant="unelevated"
          on:click={updateContacts}
        >
          refresh
        </Button>
      </div>
    {/if}
  </Header>
  <Content>
    {#if $drawer == "Notification"}
      <div class="list-box">
        {#each $notifications as n}
          <Card>
            <C_Content class="mdc-typography--body2">
              <h6>{n.title}</h6>
              {n.body}
            </C_Content>
            <Actions>
              {#each n.actions ?? [] as action}
                <ActionButtons>
                  <Button
                    on:click={() => handleNotificationClick(n, action.action)}
                  >
                    <Label>{action.title}</Label>
                  </Button>
                </ActionButtons>
              {/each}
              <ActionIcons>
                <IconButton
                  class="material-icons"
                  on:click={() => deleteNotification(n.tag)}
                >
                  close
                </IconButton>
              </ActionIcons>
            </Actions>
          </Card>
        {/each}
      </div>
    {:else}
      <div class="list-box">
        {#await $contacts}
          <p>Contacts are loading...</p>
        {:then contacts_}
          {#each contacts_ as contact}
            <Card>
              <PrimaryAction class="items-box">
                <div class="box">
                  <div class="left">{contact.displayName}</div>
                  <div class="right">
                    <Wrapper>
                      <IconButton
                        class="material-icons"
                        aria-label="Delete contact"
                        on:click={() => deleteContact(contact.cid)}
                      >
                        delete
                      </IconButton>
                      <Tooltip>Delete contacts</Tooltip>
                    </Wrapper>
                  </div>
                </div>
              </PrimaryAction>
            </Card>
          {/each}
        {:catch}
          <p>Failed to load contacts.</p>
        {/await}
      </div>
    {/if}
  </Content>
</Drawer>

<Scrim />

{#if $page.url.pathname == "/"}
  <slot />
{:else}
  <div class="app-content">
    <AutoAdjust topAppBar={$topAppBar}>
      <slot />
    </AutoAdjust>
  </div>
{/if}

<style>
  * :global(.app-content) {
    padding: 16px;
  }
  .list-box {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 7px;
  }
  .right {
    margin-left: auto;
  }
  .left {
    padding-left: 10px;
  }
  .box {
    display: flex;
    align-items: center;
    padding: 1px;
  }
  .button-box {
    display: flex;
    gap: 5px;
    padding: 7px;
    padding-top: 10px;
  }
</style>
