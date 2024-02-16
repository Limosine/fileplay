<script lang="ts">
  import { apiClient } from "$lib/api/client";
  import { getDicebearUrl } from "$lib/lib/common";
  import { contacts } from "$lib/lib/UI";
</script>

<div id="contacts">
  {#each $contacts as contact}
    <article class="secondary-container" style="margin: 0;">
      <div class="row">
        <img
          class="circle medium"
          src={getDicebearUrl(contact.avatar_seed, 100)}
          alt="Avatar"
        />
        <div class="max">
          <p class="large-text">{contact.display_name}</p>
        </div>
        <button
          class="right transparent circle"
          on:click={() => apiClient("ws").sendMessage({ type: "deleteContact", data: contact.cid})}
        >
          <i>delete</i>
          <div class="tooltip left">Delete contact</div>
        </button>
      </div>
    </article>
  {/each}
</div>

<style>
  #contacts {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 20px;
  }
</style>
