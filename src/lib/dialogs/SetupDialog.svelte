<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Group, Label } from "@smui/button";
  import Textfield from "@smui/textfield";
  import { goto } from "$app/navigation";
  import Select, { Option } from "@smui/select";
  import { nanoid } from "nanoid";
  import Fab from "@smui/fab";
  import { Icon, Label as Icon_Label } from "@smui/common";

  import { writable } from "svelte/store";
  import { browser } from "$app/environment";

  let open = true;

  const deviceTypes = ["Computer", "Smartphone", "Smartwatch"];
  const deviceParams = writable({
    name: "",
    type: "",
  });

  const userParams = writable({
    name: "",
    avatarSeed: nanoid(8),
  });

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;

    if (event.key === "Enter" && $deviceParams.name && $deviceParams.type) {
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

  async function addDevice() {
    const res = await fetch("/api/user/contacts/add", {
      method: "POST",
      body: JSON.stringify({
        deviceId: $deviceParams.name,
        deviceSecret: "test secret",
      }),
    });

    const json = await res.json();
    const result = JSON.stringify(json);

    return result;
  }

  const newUser = writable(true);

  let disabled: boolean;

  $: {
    disabled = (function () {
      if ($deviceParams.name && $deviceParams.type) {
        if ($newUser && $userParams.name && !profaneUsername) {
          return false;
        } else if (!$newUser && linkingCode) {
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    })();
  }

  let linkingCode = "";

  let profaneUsername: { loading: boolean; profane: boolean } = {
    loading: false,
    profane: false,
  };

  function updateIsProfaneUsername() {
    if(!browser) return;
    profaneUsername.loading = true;
    fetch("/api/checkIsUsernameProfane", {
      method: "POST",
      body: JSON.stringify({
        username: $userParams.name,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        profaneUsername.profane = json.isProfane;
        profaneUsername.loading = false;
      })
      .catch((e) => {
        console.error(e);
        profaneUsername.profane = false;
        profaneUsername.loading = false;
      });
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

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
    <h4>Device</h4>
    <div id="content">
      <Textfield
        bind:value={$deviceParams.name}
        label="Device Name"
        input$maxlength={18}
      />
      <Select
        bind:value={$deviceParams.type}
        label="Device Type"
        input$maxlength={18}
      >
        {#each deviceTypes as type}
          <Option value={type}>{type}</Option>
        {/each}
      </Select>
    </div>
    <br />
    <h4>User</h4>
    <div id="content">
      <Group variant="outlined">
        {#if $newUser}
          <Button variant="unelevated">
            <Label>New</Label>
          </Button>
          <Button on:click={() => ($newUser = false)} variant="outlined">
            <Label>Connect to existing</Label>
          </Button>
        {:else}
          <Button on:click={() => ($newUser = true)} variant="outlined">
            <Label>New</Label>
          </Button>
          <Button variant="unelevated">
            <Label>Connect to existing</Label>
          </Button>
        {/if}
      </Group>
    </div>
    {#if $newUser}
      <div class="user">
        <Textfield
          bind:value={$userParams.name}
          bind:invalid={profaneUsername.profane}
          on:focusout={updateIsProfaneUsername}
          label="Username"
          input$maxlength={18}
        />
        <div class="vflex">
          <h4>Avatar</h4>
          <div class="avatar">
            <img
              src="https://api.dicebear.com/6.x/adventurer/svg?seed={$userParams.avatarSeed}&radius=50&backgroundColor=b6e3f4"
              alt="Your Avatar"
            />
            <div class="fab">
              <Fab
                color="primary"
                on:click={() => ($userParams.avatarSeed = nanoid(8))}
                mini
              >
                <Icon class="material-icons">refresh</Icon>
              </Fab>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div>
        <p>
          Please generate a linking code on a device already <br />
          connected to the user by going to Settings > Devices ><br />
          Generate linking code.
        </p>
        <Textfield
          label="Linking Code"
          input$maxlength={6}
          bind:value={linkingCode}
          input$placeholder="XXXXXX"
          type="number"
        />
      </div>
    {/if}
  </Content>
  <Actions>
    <Button action="confirm" bind:disabled>
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

  .user {
    margin-top: 1em;
    display: grid;
    grid-template-columns: auto auto;
    grid-gap: 1rem;
  }

  img {
    width: 7em;
  }

  .vflex {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .avatar {
    margin-top: 0.7em;
    position: relative;
  }

  .fab {
    position: absolute;
    bottom: 0;
    right: 0;
  }
</style>
