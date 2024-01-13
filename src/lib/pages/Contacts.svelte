<script lang="ts">
  import { getDicebearUrl } from "$lib/lib/common";
  import { contacts } from "$lib/lib/UI";
  import { trpc } from "$lib/trpc/client";
</script>

<div id="contacts">
  {#each $contacts as contact}
    <article style="margin: 0;">
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
          on:click={() => trpc().deleteContact.mutate(contact.cid)}
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
    gap: 7px;
    padding: 7px;
  }
</style>
