<script lang="ts" context="module">
  import Drawer, { AppContent, Content } from "@smui/drawer";
  import List, { Item, Text } from "@smui/list";
  import { writable } from "svelte/store";


  let width: number;
</script>

<svelte:window bind:outerWidth={width} />

<div>
  <Drawer>
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
    <AppContent>
      <!-- class="app-content" -->
      <!-- <AutoAdjust {topAppBar}></AutoAdjust> -->
      <p>hi</p>
      <slot />
    </AppContent>
  {:else}
    <slot />
  {/if}
</div>

<!-- ::file-selector-button -->
<style>
  * :global(.app-content) {
    padding: 16px;
  }
</style>
