<script lang="ts">
  import { nanoid } from "nanoid";
  import { Icon } from "@smui/common";
  import Fab from "@smui/fab";
  import Textfield from "@smui/textfield";

  import { userParams, profaneUsername, updateIsProfaneUsername, setupLoading, original_username, original_avatarSeed } from "$lib/stores/Dialogs";
  import { user_loaded, user } from "$lib/personal";

  const loadInfos = (user: {
    uid: number;
    displayName: string;
    isOnline: number;
    avatarSeed: string;
    createdAt: number;
    lastSeenAt: number;
  }) => {
    $userParams.displayName = user.displayName;
    $userParams.avatarSeed = user.avatarSeed;
    $original_username = user.displayName;
    $original_avatarSeed = user.avatarSeed;
  }

  const generateAvatar = () => {
    $userParams.avatarSeed = nanoid(8);
  }
</script>

<div style="display: none">
  {#if $user_loaded}
    {#await $user then user}
      {loadInfos(user)}
    {/await}
  {:else}
    {generateAvatar()}
  {/if}
</div>

<div class="user">
  <Textfield
    bind:value={$userParams.displayName}
    bind:invalid={$profaneUsername.profane}
    bind:disabled={$setupLoading}
    on:focusout={() => updateIsProfaneUsername()}
    label="Username"
    input$maxlength={32}
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
          bind:disabled={$setupLoading}
          mini
        >
          <Icon class="material-icons">refresh</Icon>
        </Fab>
      </div>
    </div>
  </div>
</div>

<style>
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
