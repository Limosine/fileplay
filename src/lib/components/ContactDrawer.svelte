<script lang="ts">
  import Drawer, { Content, Header, Subtitle, Title } from "@smui/drawer";
  import { AutoAdjust } from "@smui/top-app-bar";

  import { topAppBar } from "./TopAppBar.svelte";
  import Tooltip, { Wrapper } from "@smui/tooltip";
  import IconButton from "@smui/icon-button";
  import Card, { PrimaryAction } from "@smui/card";
  import Button from "@smui/button";

  import { add_open } from "$lib/stores/Dialogs";

  import { contacts, updateContacts } from "$lib/personal";

  import { contacts_drawer_open as open } from "$lib/stores/Dialogs";
  import { page } from "$app/stores";

  async function deleteContact(cid: number) {
    await fetch(`/api/contacts?cid=${cid}`, {
      method: "DELETE",
    });
    await updateContacts()
  }
</script>

  <Drawer
    class="mdc-top-app-bar--fixed-adjust"
    variant="dismissible"
    bind:open={$open}
  >
    <Header>
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
    </Header>
    <Content>
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
                        on:click={() => deleteContact(contact.cid)}>
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
    </Content>
  </Drawer>

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
