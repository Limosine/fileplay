<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Textfield from '@smui/textfield';
  import { goto } from "$app/navigation";
  import { onMount } from 'svelte';

  import { open as drawer_open } from '../../../lib/components/Drawer.svelte';

  drawer_open.set(false);

  let open = true;

  let uid = "";
  let hostname: string;

  onMount(() => {
    hostname = location.hostname;
    setHostname();
  });

  function setHostname() {
    if (!uid.includes("@")) {
      hostname = uid.slice(uid.search("@"));
      console.log(hostname);
    }
  }

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;

    if (event.key === "Escape") {
      closeHandler("cancel");
    } else if (event.key === "Enter" && uid != "") {
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
        console.log(addContact());
    }
    goto("/");
  }

  async function addContact () {
	  const res = await fetch('/api/user/contacts/add', {
		  method: 'POST',
      body: JSON.stringify({deviceId: uid, deviceSecret: "test secret"})
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
  <Title id="title">Add contact</Title>
  <Content>
    <div id="content">
      <Textfield on:input={setHostname} bind:value={uid} label="Username" input$maxlength={18}>
      </Textfield>
    </div>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="confirm" disabled={uid == ""}>
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