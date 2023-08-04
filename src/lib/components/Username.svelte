<script lang="ts">
  import { nanoid } from "nanoid";

  import {
    userParams,
    user,
    user_loaded,
    profaneUsername,
    updateIsProfaneUsername,
  } from "$lib/lib/UI";
  import { getDicebearUrl } from "$lib/lib/common";

  const loadInfos = (user: {
    uid: number;
    displayName: string;
    avatarSeed: string;
    createdAt: number;
    lastSeenAt: number;
  }) => {
    $userParams.displayName = user.displayName;
    $userParams.avatarSeed = user.avatarSeed;
    // $original_username = user.displayName;
    // $original_avatarSeed = user.avatarSeed;
  };

  const generateAvatar = () => {
    $userParams.avatarSeed = nanoid(8);
  };
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

<div id="user">
  <div class="field label {$profaneUsername.profane ? "invalid" : ""}">
    <input
      bind:value={$userParams.displayName}
      on:focusout={() => updateIsProfaneUsername()}
      maxlength={32}
    />
    <!-- svelte-ignore a11y-label-has-associated-control-->
    <label>Username</label>
  </div>
  <div id="vflex">
    <p class="bold" style="font-size: large">Avatar</p>
    <div id="avatar">
      <img
        src={getDicebearUrl($userParams.avatarSeed, 150)}
        alt="Your Avatar"
      />
      <div id="fab">
        <button
          class="circle"
          on:click={() => ($userParams.avatarSeed = nanoid(8))}
        >
          <i>refresh</i>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  #user {
    margin: 1em 0em 1.5em 0em;
    display: grid;
    grid-template-columns: auto auto;
    grid-gap: 1rem;
  }

  img {
    width: 7em;
    aspect-ratio: 1/1;
  }

  #vflex {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  #avatar {
    margin-top: 0.7em;
    position: relative;
  }

  #fab {
    position: absolute;
    bottom: -5px;
    right: -5px;
  }
</style>
