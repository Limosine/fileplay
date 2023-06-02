<script lang="ts" context="module">
  import Drawer, { AppContent, Content, Header, Subtitle, Title } from "@smui/drawer";
  import { AutoAdjust } from "@smui/top-app-bar";
  import { writable } from 'svelte/store';
  import { page } from '$app/stores';

  import { topAppBar } from './TopAppBar.svelte';
  import Tooltip, { Wrapper } from "@smui/tooltip";
  import IconButton from "@smui/icon-button";
  import Card, { PrimaryAction } from "@smui/card";
  import Fab, { Label, Icon } from "@smui/fab";
  import Button from "@smui/button";

  import { add_open } from "$lib/stores/Dialogs";

  export const open = writable(false);

  async function getContacts(): Promise<{cid: number, displayName: string, avatarSeed: string, linkedAt: number, isOnline: number}[]> {
    const res = await fetch('/api/contacts', {
      method: 'GET'
    });

    const contacts = await res.json();

    return contacts;
  }
</script>

<div dir="rtl">
  <Drawer class="mdc-top-app-bar--fixed-adjust" dir="ltr" variant="dismissible" bind:open={$open}>
    <Header dir="ltr">
      <Title>Contacts</Title>
      <Subtitle>Manage your contacts</Subtitle>
      <div class="button-box">
        <Button
          variant="unelevated"
          color="primary"
          style="width: 100%;"
          on:click={() => add_open.update(open => (open = !open))}
        >
          <Icon class="material-icons">add_circle</Icon>
          &ensp;Add contact
        </Button>
      </div>
    </Header>
    <Content>
      <div class="list-box">
        {#await getContacts()}
          <p>Contacts are loading...</p>
        {:then contacts}
          {#each contacts as contact}
            <Card>
              <PrimaryAction class="items-box">
                <div class="box">
                  <div class="left">{contact.displayName}</div>
                  <div class="right">
                    <Wrapper>
                      <IconButton class="material-icons" aria-label="Delete contact"
                        >more_vert</IconButton>
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
      </div>
    </Content>
  </Drawer>
</div>


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