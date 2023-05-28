<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Group, Label } from "@smui/button";
  import Textfield from '@smui/textfield';
  import { goto } from "$app/navigation";
  import Select, { Option } from '@smui/select';

  import { writable } from "svelte/store";

  let open = true;

  let deviceid = "";
  let devicetype = "";
  const types = ["Computer", "Smartphone", "Smartwatch"];

  let username = "";

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;

    if (event.key === "Enter" && deviceid != "") {
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
        console.log(addDevice());
    }
    goto("/");
  }

  async function addDevice () {
	  const res = await fetch('/api/user/contacts/add', {
		  method: 'POST',
      body: JSON.stringify({deviceId: deviceid, deviceSecret: "test secret"})
	  });
		
	  const json = await res.json();
	  const result = JSON.stringify(json);

    return result;
  }

  const newUser = writable(true);

</script>

<svelte:window on:keydown={handleKeyDown}/>

<Dialog
  bind:open
  scrimClickAction=""
  escapeKeyAction=""
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Setup</Title>
  <Content>
    <h6>Device</h6>
    <div id="content">
      <Textfield bind:value={deviceid} label="Device Name" input$maxlength={18}/>
      <Select bind:value={devicetype} label="Device Type" input$maxlength={18}>
        {#each types as type}
        <Option value={type}>{type}</Option>
        {/each}
      </Select>
    </div>
    <br/>
    <h6>User</h6>
    <div id="content">
      <Group variant="outlined">
        {#if $newUser}
        <Button variant="unelevated">
          <Label>New</Label>
        </Button>
        <Button on:click={() => $newUser = false } variant="outlined">
          <Label>Connect to existing</Label>
        </Button>
        {:else}
        <Button on:click={() => $newUser = true} variant="outlined">
          <Label>New</Label>
        </Button>
        <Button variant="unelevated">
          <Label>Connect to existing</Label>
        </Button>
        {/if}
      </Group>
    </div>
    <hr style="margin: 10px; border-top-width: 0px;"/>
    {#if $newUser}
    <Textfield bind:value={username} label="Username" input$maxlength={18}/>
    {/if}
  </Content>
  <Actions>
    <Button action="confirm" disabled={!deviceid || !username || !devicetype}>
      <Label>Finish</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  #content {
    display: flex;
    flex-flow: row;
    justify-content: center;
    gap: 10px;
  }
</style>