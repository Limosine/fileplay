<script lang="ts">
  import Button from "@smui/button";
  import Dialog, { Actions, Content, Title } from "@smui/dialog";
  import Textfield from "@smui/textfield";
  import HelperText from "@smui/textfield/helper-text";
  import { writable } from "svelte/store";
  import Select, { Option } from "@smui/select";
  import SegmentedButton, { Segment } from "@smui/segmented-button";
  import { nanoid } from "nanoid";
  import Fab from "@smui/fab";
  import { Icon, Label } from "@smui/common";
  import Filter from "bad-words";

  export let open: boolean = false;

  const deviceParams = writable({
    name: "",
    type: "PC",
  });

  const filter = new Filter();

  const userParams = writable({
    name: "",
    avatarSeed: nanoid(8),
  });

  let selected = "New";

  const deviceTypes = ["Watch", "Phone", "PC"];

  let isProfaneUsername = false;
  let linkingCode = "";

  $: isProfaneUsername = filter.isProfane($userParams.name);
</script>

<Dialog
  bind:open
  scrimClickAction=""
  escapeKeyAction=""
  aria-labelledby="mandatory-title"
  aria-describedby="mandatory-content"
>
  <Title>Setup</Title>

  <Content>
    <div class="chapter">
      <h2>Device</h2>
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
        {#each deviceTypes as deviceType}
          <Option value={deviceType}>{deviceType}</Option>
        {/each}
      </Select>
    </div>
    <div class="chapter">
      <h2>User</h2>
      <SegmentedButton
        segments={["New", "Link to existing"]}
        let:segment
        singleSelect={true}
        bind:selected
      >
        <Segment segment>
          <Label>{segment}</Label>
        </Segment>
      </SegmentedButton>

      {#if selected === "New"}
        <div class="col-2">
          <div>
            <!-- helper text if invalid-->
            <Textfield
              label="Username"
              input$maxlength={18}
              bind:value={$userParams.name}
              bind:invalid={isProfaneUsername}
            />
          </div>
          <div class="vflex">
            <h2>Avatar</h2>
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
      {:else if selected === "Link to existing"}
        <p>
          Please generate a linking code on a device already connected to the
          user by going to settings > devices > generate linking code. Enter it
          below.
        </p>
        <Textfield
          label="Linking Code"
          input$maxlength={18}
          bind:value={linkingCode}
          input$placeholder="XXXXXX"
        />
      {/if}
    </div>
  </Content>
  <Actions>
    <Button
      disabled={$deviceParams.name === "" ||
        (selected === "New" &&
          ($userParams.name === "" || isProfaneUsername)) ||
        (selected === "Link to existing" && linkingCode.length !== 6)}
    >
      <!-- prevent closing and wait for server respose, the close programmatically -->
      <Label>Finish</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  .chapter:not(:first-child) {
    margin-top: 2rem;
  }

  .col-2 {
    margin-top: 1em;
    display: grid;
    grid-template-columns: auto auto;
    grid-gap: 1rem;
  }
  img {
    background: white;
    border-radius: 50%;
    float: right;
    aspect-ratio: 1/1;
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
