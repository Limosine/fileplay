<script lang="ts">
  import { nanoid } from "nanoid";

  import { getDicebearUrl } from "$lib/lib/common";
  import {
    userParams,
    user,
    profaneUsername,
    updateIsProfaneUsername,
  } from "$lib/lib/UI";

  $: {
    if ($user !== undefined) {
      // Load infos
      $userParams.display_name = $user.display_name;
      $userParams.avatar_seed = $user.avatar_seed;
    } else {
      // Generate avatar seed
      $userParams.avatar_seed = nanoid(8);
    }
  }
</script>

<div id="user">
  <div class="field label {$profaneUsername.profane ? 'invalid' : ''}">
    <input
      bind:value={$userParams.display_name}
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
        src={getDicebearUrl($userParams.avatar_seed, 150)}
        alt="Your Avatar"
      />
      <div id="fab">
        <button
          class="circle"
          on:click={() => ($userParams.avatar_seed = nanoid(8))}
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
