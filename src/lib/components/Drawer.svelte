<script lang="ts" context="module">
  import Drawer, { AppContent, Content } from "@smui/drawer";
  import List, { Item, Text } from "@smui/list";
  import { AutoAdjust } from "@smui/top-app-bar";
  import { writable } from 'svelte/store';
  import { page } from '$app/stores';

  import { topAppBar } from './TopAppBar.svelte';

  export const open = writable(false);

  let width: number;
</script>

<svelte:window bind:outerWidth={width}></svelte:window>

<aside>
  <Drawer class="mdc-top-app-bar--fixed-adjust" variant="dismissible" bind:open={$open}>
    <Content>
      <List>
        <Item href="/devices/add">
          <Text>Add device</Text>
        </Item>
        <Item href="/contacts/add">
          <Text>Add contact</Text>
        </Item>
      </List>
    </Content>
  </Drawer>

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
</aside>

<!-- ::file-selector-button -->
<style>
  * :global(.app-content) {
    padding: 16px;
  }
</style>