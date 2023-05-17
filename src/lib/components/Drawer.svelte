<script lang="ts" context="module">
  import Drawer, { AppContent, Content } from "@smui/drawer";
  import List, { Item, Text } from "@smui/list";
  import { writable } from 'svelte/store';

  export const open = writable(false);
  
  let width: number;
</script>

<svelte:window bind:outerWidth={width}></svelte:window>

<aside>
  <Drawer class="mdc-top-app-bar--fixed-adjust" variant="dismissible" bind:open={$open}>
    <Content>
      <List>
        <Item href="javascript:void(0)">
          <Text>Add device</Text>
        </Item>
        <Item href="/contacts/add">
          <Text>Add contact</Text>
        </Item>
      </List>
    </Content>
  </Drawer>

  {#if width >= 650}
  <AppContent> <!-- class="app-content" -->
    <!-- <AutoAdjust {topAppBar}></AutoAdjust> -->
    
    <slot />

  </AppContent>
  {:else}
  <slot />
  {/if}
</aside>

<!-- ::file-selector-button -->
<style>
  * :global(.app-content) {
    padding: 16px;
  }
</style>