<script lang="ts">
  import { apiClient } from "$lib/api/client";
  import { getDicebearUrl } from "$lib/lib/common";
  import { contacts, layout, openDialog } from "$lib/lib/UI";

  import Button from "$lib/components/Button.svelte";
</script>

{#each $contacts as contact, index}
  {#if index === 0 && $layout == "desktop"}
    <p id="header" class="bold">Contacts</p>
  {/if}

  {#if index !== 0}
    <div class="divider"></div>
  {/if}

  <Button
    onclick={async () =>
      (await openDialog({ mode: "delete" })) &&
      apiClient("ws").sendMessage({
        type: "deleteContact",
        data: contact.uid,
      })}
  >
    <img
      class="circle medium"
      src={getDicebearUrl(contact.avatar_seed)}
      style="height: 45px; width: 45px; margin: 0;"
      alt="Avatar"
      draggable="false"
    />

    <div>
      <p id="title">{contact.display_name}</p>
      <p id="subtitle">
        {contact.devices.length} device{contact.devices.length === 1 ? "" : "s"}
        online.
      </p>
    </div>
  </Button>
{:else}
  <div class="centered">
    <p class="large-text">No contacts available</p>
  </div>
{/each}

<style>
  .centered {
    height: 100%;
    display: flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;
  }

  #header {
    margin: 0 0 5px 0;
    padding: 0 20px;
    color: var(--secondary);
  }
</style>
