<script lang="ts">
  import { getDicebearUrl } from "$lib/common";
  import { contacts, updateContacts } from "$lib/personal";

  async function deleteContact(cid: number) {
    await fetch(`/api/contacts?cid=${cid}`, {
      method: "DELETE",
    });
    await updateContacts();
  }
</script>

{#await $contacts}
  <p>Contacts are loading...</p>
{:then contacts_}
  <div id="contacts">
    {#each contacts_ as contact}
      <article style="margin: 0;">
        <div class="row">
          <img
            class="circle medium"
            src={getDicebearUrl(contact.avatarSeed, 100)}
            alt="Avatar"
          />
          <div class="max">
            <p class="large-text">{contact.displayName}</p>
          </div>
          <button
            class="right transparent circle"
            on:click={() => deleteContact(contact.cid)}
          >
            <i>delete</i>
            <div class="tooltip left">Delete contact</div>
          </button>
        </div>
      </article>
    {/each}
  </div>

  <!-- svelte-ignore missing-declaration -->
  <button id="add-mobile" class="s square round extra" on:click={() => ui("#dialog-add")}>
    <i>add</i>
  </button>

  <!-- svelte-ignore missing-declaration -->
  <button id="add-desktop" class="l m square round extra" on:click={() => ui("#dialog-add")}>
    <i>add</i>
  </button>
{/await}

<style>
  #contacts {
    display: flex;
    flex-flow: column;
    gap: 7px;
    padding: 7px;
  }

  #add-mobile {
    position: fixed;
    bottom: 95px;
    right: 15px;
    margin: 0;
  }

  #add-desktop {
    position: fixed;
    bottom: 20px;
    right: 20px;
    margin: 0;
  }
</style>