<script lang="ts">
  import Dialog, { Title, Content } from "@smui/dialog";
  import Button, { Group, Label } from "@smui/button";
  import Textfield from "@smui/textfield";
  import Select, { Option } from "@smui/select";
  import { nanoid } from "nanoid";
  import Fab from "@smui/fab";
  import { Icon } from "@smui/common";
  import LinearProgress from "@smui/linear-progress";

  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  let open: boolean;

  let newUser = true;

  let linkingCode = "";

  const deviceTypes = ["Computer", "Smartphone", "Smartwatch"];
  const deviceParams = writable({
    displayName: "",
    type: "",
  });

  const userParams = writable({
    displayName: "",
    avatarSeed: nanoid(8),
  });

  let setupLoading = false;

  let actionDisabled: boolean;
  $: {
    if (!$deviceParams.displayName || !$deviceParams.type) actionDisabled = true
    else if (newUser) {
      actionDisabled = !$userParams.displayName ||
        !$userParams.avatarSeed ||
        profaneUsername.profane ||
        profaneUsername.loading
    } else {
      actionDisabled = !linkingCode
    }
  }

  let profaneUsername: { loading: boolean; profane: boolean } = {
    loading: false,
    profane: false,
  };

  let setupError: string;

  function updateIsProfaneUsername() {
    if (!browser || !$userParams.displayName) return;
    profaneUsername.loading = true;
    fetch("/api/checkIsUsernameProfane", {
      method: "POST",
      body: JSON.stringify({
        username: $userParams.displayName,
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

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;
    if (event.key === "Enter" && !actionDisabled) {
      handleConfirm();
    }
  }

  async function handleResponseError(res: Response) {
    setupLoading = false;
    const json_ = await res.json();
    if (json_) {
      setupError = json_.message;
    } else {
      setupError = res.statusText;
    }
  }

  async function handleConfirm() {
    if (actionDisabled) return;
    setupLoading = true;
    // setup device if not already done so
    let storedDeviceParams = localStorage.getItem("deviceParams");
    if (
      storedDeviceParams &&
      storedDeviceParams !== JSON.stringify($deviceParams)
    ) {
      storedDeviceParams = null;
      // TODO delete old user with still present cookie auth
    }
    if (!storedDeviceParams) {
      const res = await fetch("/api/setup/device", {
        method: "POST",
        body: JSON.stringify($deviceParams),
      });
      if (String(res.status).charAt(0) !== "2") {
        handleResponseError(res);
        return;
      }
      localStorage.setItem("deviceParams", JSON.stringify($deviceParams));
    }
    switch (newUser) {
      case true:
        // create new user
        const res = await fetch("/api/setup/user", {
          method: "POST",
          body: JSON.stringify($userParams),
        });
        if (res.status !== 200) {
          handleResponseError(res);
          return;
        }
        break;
      case false:
        // link to existing user
        const res2 = await fetch("/api/devices/link", {
          method: "POST",
          body: JSON.stringify(linkingCode),
        });
        if (res2.status !== 200) {
          handleResponseError(res2);
          return;
        }
        break;
    }

    localStorage.removeItem("deviceParams");
    localStorage.setItem("setupDone", "true");
    open = false;
    setupLoading = false;
  }

  onMount(() => {
    if (!browser) return;
    // if device is not set up, open dialog
    if (!localStorage.getItem("setupDone")) {
      open = true;
      // if setup was partially completed, load values
      const storedDeviceParams = localStorage.getItem("deviceParams");
      if (storedDeviceParams) {
        $deviceParams = JSON.parse(storedDeviceParams);
      }
    }
  });
</script>

<svelte:window on:keydown={handleKeyDown} />

<Dialog
  bind:open
  scrimClickAction=""
  escapeKeyAction=""
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={() => console.log("closed")}
>
  {#if setupLoading}
    <LinearProgress indeterminate />
  {/if}
  <Title id="title">Setup</Title>
  <Content>
    <h6>Device</h6>
    <div id="content">
      <Textfield
        bind:value={$deviceParams.displayName}
        label="Device Name"
        bind:disabled={setupLoading}
        input$maxlength={18}
      />
      <Select
        bind:value={$deviceParams.type}
        label="Device Type"
        bind:disabled={setupLoading}
        input$maxlength={18}
      >
        {#each deviceTypes as type}
          <Option value={type}>{type}</Option>
        {/each}
      </Select>
    </div>
    <br />
    <h6>User</h6>
    <div id="content">
      <Group variant="outlined">
        {#if newUser}
          <Button variant="unelevated" bind:disabled={setupLoading}>
            <Label>New</Label>
          </Button>
          <Button
            bind:disabled={setupLoading}
            on:click={() => (newUser = false)}
            variant="outlined"
          >
            <Label>Connect to existing</Label>
          </Button>
        {:else}
          <Button
            bind:disabled={setupLoading}
            on:click={() => (newUser = true)}
            variant="outlined"
          >
            <Label>New</Label>
          </Button>
          <Button variant="unelevated" bind:disabled={setupLoading}>
            <Label>Connect to existing</Label>
          </Button>
        {/if}
      </Group>
    </div>
    {#if newUser}
      <div class="user">
        <Textfield
          bind:value={$userParams.displayName}
          bind:invalid={profaneUsername.profane}
          bind:disabled={setupLoading}
          on:focusout={updateIsProfaneUsername}
          label="Username"
          input$maxlength={18}
        />
        <div class="vflex">
          <h6>Avatar</h6>
          <div class="avatar">
            <img
              src="https://api.dicebear.com/6.x/adventurer/svg?seed={$userParams.avatarSeed}&radius=50&backgroundColor=b6e3f4"
              alt="Your Avatar"
            />
            <div class="fab">
              <Fab
                color="primary"
                on:click={() => ($userParams.avatarSeed = nanoid(8))}
                bind:disabled={setupLoading}
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
    <div class="actions">
      <Button bind:disabled={actionDisabled} on:click={handleConfirm}>
        <Label>Finish</Label>
      </Button>
      {#if setupError}
        <p style="color:red">{setupError}</p>
      {/if}
    </div>
  </Content>
</Dialog>

<style>
  .actions {
    margin-top: 1.6em;
    display: flex;
    flex-flow: row-reverse;
    justify-content: space-between;
    align-items: center;
  }
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
    aspect-ratio: 1/1;
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
