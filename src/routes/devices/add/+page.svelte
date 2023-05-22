<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Textfield from '@smui/textfield';
  import { goto } from "$app/navigation";

  import { open as drawer_open } from '../../../lib/components/Drawer.svelte';

  drawer_open.set(false);

  let open = true;

  let deviceid = "";

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;

    if (event.key === "Escape") {
      closeHandler("cancel");
    } else if (event.key === "Enter" && deviceid != "") {
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
</script>

<svelte:window on:keydown={handleKeyDown}/>

<Dialog
  bind:open
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Add device</Title>
  <Content>
    <div id="content">
      <Textfield bind:value={deviceid} label="Device ID" input$maxlength={18}>
      </Textfield>
    </div>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="confirm" disabled={deviceid == ""}>
      <Label>Add</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  #content {
    display: flex;
    flex-flow: column;
  }
</style>