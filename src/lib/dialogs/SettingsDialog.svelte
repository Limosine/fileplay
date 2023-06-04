<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Label, Group } from "@smui/button";
  import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
  import dayjs from "dayjs";
  import { devices, devices_loaded, getDevices } from "$lib/personal";
  import IconButton from "@smui/icon-button/src/IconButton.svelte";
  import { settings_open } from "$lib/stores/Dialogs";

  let devices_section = true;

  function convertUnixtoDate(unix_timestamp: number) {
    const dayjs_object = dayjs.unix(unix_timestamp);
    const date = dayjs_object.format("D.M.YYYY, H:mm");
    return date;
  }

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;

    if (event.key === "Escape") {
      settings_open.set(false);
      closeHandler("cancel");
    } else if (event.key === "Enter") {
      settings_open.set(false);
      closeHandler("confirm");
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
      case "confirm":
        console.log("Settings dialog closed");
    }
  }

  async function generateCode(): Promise<{code: string, expires: number, refresh: number}> {

      const res = await fetch('/api/contacts/link', {
          method: 'GET'
      });

      const codeproperties = await res.json();

    return codeproperties;
  }
</script>

<svelte:window on:keydown={handleKeyDown}/>

<Dialog
  bind:open={$settings_open}
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Settings</Title>
  <Content>
    <div id="content">
      <div id="buttons">
        <Group variant="outlined">
          {#if devices_section}
            <Button variant="unelevated">
              <Label>Devices</Label>
            </Button>
            <Button
              on:click={() => {
                devices_section = false;
                generateCode();
              }}
              variant="outlined"
            >
              <Label>User</Label>
            </Button>
          {:else}
            <Button
              on:click={() => {
                devices_section = true;
              }}
              variant="outlined"
            >
              <Label>Devices</Label>
            </Button>
            <Button variant="unelevated">
              <Label>User</Label>
            </Button>
          {/if}
        </Group>
      </div>

      {#if devices_section}
        <DataTable table$aria-label="Devices list" style="max-width: 100%;">
          <Head>
            <Row>
              <Cell>Display Name</Cell>
              <Cell>Type</Cell>
              <Cell>Last seen</Cell>
              <Cell/>
            </Row>
          </Head>
          {#if $devices_loaded}
            {#await $devices}
              <p>Contacts are loading...</p>
            {:then devices}
              {#each devices as device}
                <Body>
                  <Row>
                    <Cell>{device.displayName}</Cell>
                    <Cell>{device.type}</Cell>
                    <Cell>{convertUnixtoDate(device.lastSeenAt)}</Cell>
                    <Cell><IconButton class="material-icons">delete</IconButton></Cell>
                  </Row>
                </Body>
              {/each}
            {:catch}
              <p>Failed to load devices.</p>
            {/await}
          {/if}
        </DataTable>
      {/if}
    </div>
  </Content>
  <Actions>
    <Button action="confirm">
      <Label>Close</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  #content {
    display: flex;
    flex-flow: column;
  }

  #buttons {
    display: flex;
    flex-flow: column;
    align-items: center;
    padding-bottom: 15px;
  }
</style>