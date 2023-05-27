<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Card, { PrimaryAction } from "@smui/card";
  import Paper, { Content as P_Content } from "@smui/paper";
  import Button, { Label } from "@smui/button";
  import { goto } from "$app/navigation";
  import { writable } from "svelte/store";

  let open = true;
  const selected = writable<{ [name: string]: string }>({});

  function closeHandler(e: CustomEvent<{ action: string }>) {
    console.log(e.detail.action);
    switch (e.detail.action) {
      case "close":
      case "cancel":
        goto("/");
        break;
      case "confirm":
        goto("/");
        break;
    }
  }

  function select(name: string) {
    if ($selected[name] == "selected") {
      delete $selected[name];
      $selected = $selected;
    } else {
      $selected[name] = "selected";
    }
  }

  var names: string[] = [
    "Computer",
    "Smartphone",
    "Tablet",
    "Laptop",
    "Smartwatch",
  ];

  for (let i = 0; i < 100; i++) {
    names.push(String(i));
  }

  var ghost_items = new Array(4 - (names.length % 4));
</script>

<Dialog
  bind:open
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Select contact(s)</Title>
  <Content>
    <Paper variant="unelevated">
      <P_Content>
        <div id="content">
          {#each names as name}
            <Card class={$selected[name]}>
              <PrimaryAction
                on:click={() => select(name)}
                class="content-items"
              >
                {name}
              </PrimaryAction>
            </Card>
          {/each}
          {#each ghost_items as ghost_item}
          <div class="content-items" />
          {/each}
        </div>
      </P_Content>
    </Paper>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="confirm">
      <Label>Send</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  #content {
    display: flex;
    flex-basis: auto;
    flex-flow: row wrap;
    justify-content: center;
    gap: 5px;
  }

  * :global(.content-items) {
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
