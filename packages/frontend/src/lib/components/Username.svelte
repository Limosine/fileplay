<script lang="ts">
  import { nanoid } from "nanoid";

  import { getDicebearUrl } from "../../../../common/common";
  import { ui_object } from "$lib/lib/UI.svelte";

  $effect(() => {
    if (ui_object.user !== undefined) {
      // Load infos
      ui_object.userParams.display_name = ui_object.user.display_name;
      ui_object.userParams.avatar_seed = ui_object.user.avatar_seed;
    }
  });
</script>

<div id="user">
  <div class="field label {ui_object.profaneUsername.profane ? 'invalid' : ''}">
    <input
      bind:value={ui_object.userParams.display_name}
      onblur={() => ui_object.checkProfanity()}
      maxlength={32}
    />
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label>Username</label>
  </div>
  <div id="vflex">
    <p class="bold" style="font-size: large">Avatar</p>
    <div id="avatar">
      <img
        src={getDicebearUrl(ui_object.userParams.avatar_seed)}
        alt="Your Avatar"
        draggable="false"
      />
      <div id="fab">
        <button
          class="circle"
          onclick={() => (ui_object.userParams.avatar_seed = nanoid(8))}
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
