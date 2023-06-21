<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Label, Group } from "@smui/button";
  import Textfield from '@smui/textfield';

  import { add_open, codehostname } from "$lib/stores/Dialogs";
  import { onDestroy, onMount } from "svelte";
  import dayjs from "dayjs";

  let hostname: string;
  let code = "";

  let redeemCode_section = true;

  function setHostname() {
    if ($codehostname.includes("@")) {
      hostname = $codehostname.slice($codehostname.search("@")+1);
      code = $codehostname.slice(0, $codehostname.search("@"));
    } else {
      code = $codehostname;
    }
  }

  function handleContactAddKeyDown(event: CustomEvent | KeyboardEvent) {
    if (!$add_open) return;
    event = event as KeyboardEvent;

    if (event.key === "Escape") {
      add_open.set(false);
      closeHandler("cancel");
    } else if (event.key === "Enter" && code != "") {
      add_open.set(false);
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
        setHostname();
        redeemCode();
    }
  }

  async function redeemCode() {
    var link = '/api/contacts/link';
    if (hostname) {
      link = "https://" + hostname + link;
    }

	  const res = await fetch(link, {
		  method: 'POST',
      body: JSON.stringify({code: code})
	  });
  }

  async function generateCode(): Promise<{code: string, expires: number, refresh: number}> {
    // todo refresh this code after specified interval

	  const res = await fetch('/api/contacts/link', {
		  method: 'GET'
	  });

	  const codeproperties = await res.json();
    expires_at = codeproperties.expires;

    return codeproperties;
  }

  let expires_in: number;
  let expires_at: number;
  let updateInterval: any;

  function updateExpiresIn() {
    if(expires_at) expires_in = Math.round((expires_at - dayjs().unix()) / 60);
  }

  onMount(() => updateInterval = setInterval(updateExpiresIn, 1000));
  onDestroy(() => clearInterval(updateInterval));
</script>

<svelte:window on:keydown={handleContactAddKeyDown}/>

<Dialog
  bind:open={$add_open}
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Add contact</Title>
  <Content>
    <div id="content">
      <Group variant="outlined">
        {#if redeemCode_section}
          <Button variant="unelevated">
            <Label>Redeem code</Label>
          </Button>
          <Button
            on:click={() => {
              redeemCode_section = false;
              generateCode();
            }}
            variant="outlined"
          >
            <Label>Generate code</Label>
          </Button>
        {:else}
          <Button
            on:click={() => {
              redeemCode_section = true;
            }}
            variant="outlined"
          >
            <Label>Redeem code</Label>
          </Button>
          <Button variant="unelevated">
            <Label>Generate code</Label>
          </Button>
        {/if}
      </Group>
      {#if redeemCode_section}
        <Textfield bind:value={$codehostname} on:input={() => setHostname()} label="Linking code" input$maxlength={6}/>
      {:else}
        <br/>
        {#await generateCode()}
          <p>Generating code...</p>
        {:then codeproperties} 
          <p>Code: {codeproperties.code}<br/>
          Expires in {expires_in} m</p>
        {:catch}
          <p>Failed to generate code.</p>
        {/await}
      {/if}
    </div>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="confirm" disabled={code == ""}>
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
