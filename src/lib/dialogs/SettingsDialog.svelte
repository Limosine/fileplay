<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Card from '@smui/card';
  import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
  import dayjs from "dayjs";
  import { devices, devices_loaded, getDevices } from "$lib/personal";
  import IconButton from "@smui/icon-button/src/IconButton.svelte";
  import { settings_open } from "$lib/stores/Dialogs";
  import Tab, { Label as Tab_Label } from '@smui/tab';
  import TabBar from '@smui/tab-bar';
  import Username from "$lib/components/Username.svelte";
  import { userParams, profaneUsername, updateIsProfaneUsername, setupLoading, original_username, original_avatarSeed } from "$lib/stores/Dialogs";

  let active = "Account"
  let generated_code = false;

  let actionDisabled: boolean;
  $: {
    actionDisabled =
      !$userParams.displayName ||
      !$userParams.avatarSeed ||
      $profaneUsername.profane ||
      $profaneUsername.loading;
  }

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
        if (!actionDisabled) {
          updateUserInfo();
        } else {
          console.log("Username, AvatarSeed empty or username profane");
        }
    }
  }

  async function deleteDevice(did: number) {

    const res = await fetch(`/api/devices?${did}`, {
      method: 'DELETE'
    });

    const result = await res.json();

    return result;
  }

  async function generateCode(): Promise<{code: string, expires: number, refresh: number}> {

	  const res = await fetch('/api/devices/link', {
		  method: 'GET'
	  });

	  const codeproperties = await res.json();

    generated_code = true;

    return codeproperties;
  }

  async function updateUserInfo() {

    const res = await fetch('/api/user', {
      method: 'POST',
      body: JSON.stringify({
        displayName: $userParams.displayName,
        avatarSeed: $userParams.avatarSeed,
      }),
    });

    const result = await res.json();

    return result;
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
      <div id="tab_bar">
        <TabBar tabs={['Account', 'Devices']} let:tab bind:active>
          <Tab {tab}>
            <Tab_Label>{tab}</Tab_Label>
          </Tab>
        </TabBar>
      </div>

    <div id="content">
      {#if active === 'Devices'}
        <div class="button-box">
          <Button
            variant="outlined"
            color="primary"
            style="width: 100%;"
            on:click={() => generateCode()}
          >
            Generate code
          </Button>
          <Button class="material-icons" variant="outlined" on:click={() => getDevices()}>
            refresh
          </Button>
        </div>

        {#if generated_code}
          <div class="codes-box">
            <Card padded variant="outlined">
              {#await generateCode()}
                <p>Generating code...</p>
              {:then codeproperties} 
                <p>Code: {codeproperties.code}<br/>
                Expires on {convertUnixtoDate(codeproperties.expires)}</p>
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
                    <Cell><IconButton on:click={() => deleteDevice(device.did)} class="material-icons">delete</IconButton></Cell>
                  </Row>
                </Body>
              {/each}
            {:catch}
              <p>Failed to load devices.</p>
            {/await}
          {/if}
        </DataTable>
      {:else}
        <Username/>
      {/if}
    </div>
  </Content>
  <Actions>
    <Button bind:disabled={actionDisabled} action="confirm">
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