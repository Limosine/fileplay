<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Card from "@smui/card";
  import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
  import dayjs from "dayjs";
  import localizedFormat from "dayjs/plugin/localizedFormat";
  import { devices, devices_loaded, getDevices } from "$lib/personal";
  import IconButton from "@smui/icon-button";
  import Tab, { Label as Tab_Label } from "@smui/tab";
  import TabBar from "@smui/tab-bar";
  import Username from "$lib/components/Username.svelte";
  import {
    settings_open,
    editDevice_open,
    original_displayName,
    original_type,
    deviceID,
    device_edit_loaded,
    active,
    deviceParams,
    userParams,
    profaneUsername,
    original_username,
    original_avatarSeed,
  } from "$lib/stores/Dialogs";
  import { TimeFormat } from "$lib/common";
  import { onMount, onDestroy } from "svelte";
  import Device from "$lib/components/Device.svelte";

  dayjs.extend(localizedFormat);

  let generated_code = false;

  let different: boolean;
  let differentDevice: boolean;
  let actionDisabled: boolean;
  let actionDisabledDevice: boolean;
  $: {
    different =
      $userParams.displayName != $original_username ||
      $userParams.avatarSeed != $original_avatarSeed;
  }

  $: {
    differentDevice =
      $deviceParams.displayName != $original_displayName ||
      $deviceParams.type != $original_type;
  }

  $: {
    actionDisabled =
      !$userParams.displayName ||
      $profaneUsername.profane ||
      $profaneUsername.loading
  }

  $: {
    actionDisabledDevice =
      !$deviceParams.displayName ||
      !$deviceParams.type
  }

  function handleSettingsKeyDown(event: CustomEvent | KeyboardEvent) {
    if (!$settings_open) return;
    event = event as KeyboardEvent;

    if ($editDevice_open) {
      if (event.key === "Escape") {
        editDevice_open.set(false);
        closeHandlerDevice("cancel");
      } else if (event.key === "Enter") {
        editDevice_open.set(false);
        closeHandlerDevice("confirm");
      }
    } else {
      if (event.key === "Escape") {
        settings_open.set(false);
        closeHandler("cancel");
      } else if (event.key === "Enter") {
        settings_open.set(false);
        closeHandler("confirm");
      }
    }
  }

  async function closeHandler(e: CustomEvent<{ action: string }> | string) {
    let action: string;

    if (typeof e === "string") {
      action = e;
    } else {
      action = e.detail.action;
    }

    switch (action) {
      case "confirm":
        if (!actionDisabled && different) {
          await updateUserInfo();
        }
        break;
    }
  }

  async function closeHandlerDevice(e: CustomEvent<{ action: string }> | string) {
    let action: string;

    if (typeof e === "string") {
      action = e;
    } else {
      action = e.detail.action;
    }

    switch (action) {
      case "confirm":
        if (!actionDisabledDevice && differentDevice) {
          await updateDeviceInfo($deviceID);
        }
        break;
      case "delete":
        deleteDevice($deviceID);
        break;
    }
  }

  async function deleteDevice(did: number) {
    const res = await fetch(`/api/devices?${did}`, {
      method: "DELETE",
    });
  }

  async function updateDeviceInfo(did: number) {
    await fetch(`/api/devices?${did}`, {
      method: "POST",
      body: JSON.stringify({
        displayName: $deviceParams.displayName,
        type: $deviceParams.type,
      }),
    });
  }

  async function generateCode(): Promise<{
    code: string;
    expires: number;
    refresh: number;
  }> {
    const res = await fetch("/api/devices/link", {
      method: "GET",
    });

    const codeproperties: any = await res.json();

    generated_code = true;
    expires_at = codeproperties.expires;

    return codeproperties;
  }

  async function updateUserInfo() {
    await fetch("/api/user", {
      method: "POST",
      body: JSON.stringify({
        displayName: $userParams.displayName,
        avatarSeed: $userParams.avatarSeed,
      }),
    });
  }

  let expires_in: number;
  let expires_at: number;
  let updateInterval: any;

  function updateExpiresIn() {
    if (expires_at)
      expires_in = Math.round((expires_at - dayjs().unix()) / 1000 / 60);
  }

  onMount(() => (updateInterval = setInterval(updateExpiresIn, 1000)));
  onDestroy(() => clearInterval(updateInterval));
  // TODO button 'regenerate encryption keys'
</script>

<svelte:window on:keydown={handleSettingsKeyDown} />

<Dialog
  bind:open={$settings_open}
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Settings</Title>
  <Content>
    <div id="tab_bar">
      <TabBar tabs={["Account", "Devices"]} let:tab bind:active={$active}>
        <Tab {tab}>
          <Tab_Label>{tab}</Tab_Label>
        </Tab>
      </TabBar>
    </div>

    <div id="content">
      {#if $active === "Devices"}
        <div class="button-box">
          <Button
            variant="outlined"
            color="primary"
            style="width: 100%;"
            on:click={() => generateCode()}
          >
            Generate code
          </Button>
          <Button
            class="material-icons"
            variant="outlined"
            on:click={() => getDevices()}
          >
            refresh
          </Button>
        </div>

        {#if generated_code}
          <div class="codes-box">
            <Card padded variant="outlined">
              {#await generateCode()}
                <p>Generating code...</p>
              {:then codeproperties}
                <p>
                  Code: {codeproperties.code}<br />
                  Expires in {expires_in} minutes
                </p>
              {:catch}
                <p>Failed to generate code.</p>
              {/await}
            </Card>
          </div>
        {/if}

        <DataTable table$aria-label="Devices list" style="max-width: 100%;">
          <Head>
            <Row>
              <Cell>Display Name</Cell>
              <Cell>Type</Cell>
              <Cell>Last seen</Cell>
              <Cell />
            </Row>
          </Head>
          {#if $devices_loaded}
            {#await $devices}
              <p>Contacts are loading...</p>
            {:then devices}
            <Body>
              <Row>
                <Cell>{devices.self.displayName}</Cell>
                <Cell>{devices.self.type}</Cell>
                <Cell
                  >{dayjs.unix(devices.self.lastSeenAt).format(
                    TimeFormat.MinuteDate
                  )}</Cell>
                <Cell>
                  <IconButton
                    on:click={() => {$deviceID = devices.self.did; $device_edit_loaded = false; $editDevice_open = true}}
                    class="material-icons">more
                  </IconButton>
                </Cell>
              </Row>
            </Body>
              {#each devices.others as device}
                <Body>
                  <Row>
                    <Cell>{device.displayName}</Cell>
                    <Cell>{device.type}</Cell>
                    <Cell>
                      {dayjs.unix(device.lastSeenAt).format(
                        TimeFormat.MinuteDate
                      )}</Cell>
                    <Cell>
                      <IconButton
                        on:click={() => {$deviceID = device.did; $device_edit_loaded = false; $editDevice_open = true}}
                        class="material-icons">more_vert
                      </IconButton>
                    </Cell>
                  </Row>
                </Body>
              {/each}
            {:catch}
              <p>Failed to load devices.</p>
            {/await}
          {/if}
        </DataTable>
      {:else}
        <Username />
      {/if}
    </div>
  </Content>
  <Actions>
    <Button bind:disabled={actionDisabled} action="confirm">
      <Label>Close</Label>
    </Button>
  </Actions>
</Dialog>

<Dialog
  bind:open={$editDevice_open}
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandlerDevice}
>
  <Title id="title">Edit device</Title>
  <Content>
    {#if $editDevice_open}
      <Device />
    {/if}
  </Content>
  <Actions>
    <Button action="delete">
      <Label>Delete</Label>
    </Button>
    <Button bind:disabled={actionDisabledDevice} action="confirm">
      <Label>Close</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  #content {
    display: flex;
    flex-flow: column;
    gap: 7px;
  }

  .button-box {
    display: flex;
    flex-flow: row;
    gap: 5px;
  }

  #tab_bar {
    padding-bottom: 8px;
  }
</style>
