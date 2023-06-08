<script lang="ts">
  import Drawer, {
    AppContent,
    Content,
    Header,
    Subtitle,
    Title,
  } from "@smui/drawer";
  import { AutoAdjust } from "@smui/top-app-bar";

  import { topAppBar } from "./TopAppBar.svelte";
  import Tooltip, { Wrapper } from "@smui/tooltip";
  import IconButton from "@smui/icon-button";
  import Card, { PrimaryAction } from "@smui/card";
  import Button from "@smui/button";

  import { add_open } from "$lib/stores/Dialogs";

  import { getContacts, type IContact } from "$lib/personal";
  import { onMount, onDestroy } from "svelte";

  import { contacts_drawer_open as open } from "$lib/stores/Dialogs";

  let contacts: Promise<IContact[]> | IContact[] | undefined;
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

<div dir="rtl">
  <Drawer
    class="mdc-top-app-bar--fixed-adjust"
    dir="ltr"
    variant="dismissible"
    bind:open={$open}
  >
    <Header dir="ltr">
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
          on:click={() => (contacts = getContacts())}
        >
          refresh
        </Button>
      </div>
    </Header>
    <Content>
      <div class="list-box">
        {#if contacts}
          {#await contacts}
            <p>Contacts are loading...</p>
          {:then contacts}
            {#each contacts as contact}
              <Card>
                <PrimaryAction class="items-box">
                  <div class="box">
                    <div class="left">{contact.displayName}</div>
                    <div class="right">
                      <Wrapper>
                        <IconButton
                          class="material-icons"
                          aria-label="Delete contact">more_vert</IconButton
                        >
                        <Tooltip>Manage contacts</Tooltip>
                      </Wrapper>
                    </div>
                  </div>
                </PrimaryAction>
              </Card>
            {/each}
          {:catch}
            <p>Failed to load contacts.</p>
          {/await}
        {/if}
      </div>
    </Content>
  </Drawer>
</div>

<div class="app-content">
  <AutoAdjust topAppBar={$topAppBar}>
    <slot />
  </AutoAdjust>
</div>

<style>
  * :global(.app-content) {
    padding: 16px;
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
  .list-box {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 7px;
  }
</style>
