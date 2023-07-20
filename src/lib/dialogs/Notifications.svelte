<script lang="ts">
  import { notifications, deleteNotification, type INotification } from "$lib/stores/Dialogs";

  async function handleNotificationClick(n: INotification, action: string) {
    deleteNotification(n.tag);
    if (action == "close") return null;
  }
</script>

<dialog class="right" id="dialog-notifications" style="z-index: 102;">
  <nav>
    <!-- svelte-ignore missing-declaration -->
    <button
      on:click={() => ui("#dialog-notifications")}
      class="transparent circle large"
    >
      <i>close</i>
    </button>
    <h5 class="max">Notifications</h5>
  </nav>
  <div id="notifications">
    {#each $notifications as n}
      <article
        class="border"
        style="margin: 0; padding: 0; position: relative;"
      >
        <button
          on:click={() => deleteNotification(n.tag)}
          class="transparent circle large"
          style="position: absolute; right: 0; margin: 0;"
        >
          <i>close</i>
        </button>

        <div style="padding: 16px;">
          <h6>{n.title}</h6>
          <p>{n.body}</p>
          <nav class="right-align">
            {#each n.actions ?? [] as action}
              <button on:click={() => handleNotificationClick(n, action.action)}
                >{action.title}</button
              >
            {/each}
          </nav>
        </div>
      </article>
    {/each}
  </div>
</dialog>

<style>
  #notifications {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding-top: 7px;
  }
</style>