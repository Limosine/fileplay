<script lang="ts" context="module">
  import Drawer, { AppContent, Content, Header, Subtitle, Title } from "@smui/drawer";
  import { AutoAdjust } from "@smui/top-app-bar";
  import { writable } from 'svelte/store';
  import { page } from '$app/stores';

  import { topAppBar } from './TopAppBar.svelte';
  import Tooltip, { Wrapper } from "@smui/tooltip";
  import IconButton from "@smui/icon-button/src/IconButton.svelte";
  import Card from "@smui/card/src/Card.svelte";
  import PrimaryAction from "@smui/card/src/PrimaryAction.svelte";

  export const open = writable(false);

  let width: number;

  var names: string[] = [
    "Computer",
    "Smartphone",
    "Tablet",
    "Laptop",
    "Smartwatch",
  ];

  for (let i = 0; i < 100; i++) {
    names.push(String(i));
  }
</script>

<svelte:window bind:outerWidth={width}></svelte:window>

<div dir="rtl">
  <Drawer class="mdc-top-app-bar--fixed-adjust" dir="ltr" variant="dismissible" bind:open={$open}>
    <Header dir="ltr">
      <Title>Contacts</Title>
      <Subtitle>Manage your contacts</Subtitle>
    </Header>
    <Content>
      <div class="list-box">
        {#each names as name}
          <Card>
            <PrimaryAction class="items-box">
              <div class="box">
                <div class="left">{name}</div>
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
      </div>
    </Content>
  </Drawer>
</div>

{#if width >= 650}
  {#if $page.url.pathname == "/"}
    <AppContent>
      <slot />
    </AppContent>
  {:else}
    <AppContent class="app-content">

      <AutoAdjust topAppBar={$topAppBar}>
        <slot />
      </AutoAdjust>

    </AppContent>
  {/if}
{:else}
  {#if $page.url.pathname == "/"}
    <slot />
  {:else}
    <div class="app-content">

      <AutoAdjust topAppBar={$topAppBar}>
        <slot />
      </AutoAdjust>

    </div>
  {/if}
{/if}

<!-- ::file-selector-button -->
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
  .list-box {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 7px;
  }
</style>