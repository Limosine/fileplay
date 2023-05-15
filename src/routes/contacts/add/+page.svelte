<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Paper, { Content as P_Content } from "@smui/paper";
  import Button, { Label } from "@smui/button";
  import Textfield from '@smui/textfield';
  import HelperText from '@smui/textfield/helper-text';
  import { goto } from "$app/navigation";
  import { onMount } from 'svelte';

  let open = true;

  let uid = "";
  let fullusername: string;

  onMount(() => {
    setFullusername();
  });

  function setFullusername() {
    if (!uid) {
      fullusername = "username@server.com"
    } else if (!uid.includes("@")){
      fullusername = uid + "@" + location.hostname;
    } else {
      fullusername = uid;
    }
  }
  
  function closeHandler(e: CustomEvent<{ action: string }>) {
    switch (e.detail.action) {
      case "close":
      case "cancel":
        goto("/");
        break;
      case "confirm":
        console.log(addContact());
        break;
    }
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

<Dialog
  bind:open
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Add contact</Title>
  <Content>
    <div id="content">
      <Paper>
        <P_Content style="text-align: center;">
          {fullusername}
        </P_Content>
      </Paper>
      <Textfield on:input={setFullusername} bind:value={uid} label="username@server.com" input$maxlength={18}>
        <svelte:fragment slot="helper">
          <HelperText>Input user id</HelperText>
        </svelte:fragment>
      </Textfield>
    </div>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="confirm" disabled={uid == ""}>
      <Label>Send</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  #content {
    display: flex;
    flex-flow: column;
  }
</style>