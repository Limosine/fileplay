<script lang="ts">
  import {
    notifications,
    deleteNotification,
    returnProgress,
    notificationDialog,
    type NotificationRequest,
    type NotificationReceiving,
  } from "$lib/lib/UI";
  import { incoming_filetransfers } from "$lib/sharing/common";
  import { sendAnswer } from "$lib/sharing/send";
  import { acceptRequest } from "$lib/sharing/handle";

  const cancelFiletransfer = async (
    notification: NotificationRequest | NotificationReceiving,
  ) => {
    deleteNotification(notification.tag);

    sendAnswer(notification.data.did, notification.data.filetransfer_id, false);

    if (notification.title == "Receiving file(s)") {
      incoming_filetransfers.update((filetransfers) =>
        filetransfers.filter(
          (filetransfer) =>
            filetransfer.id != notification.data.filetransfer_id,
        ),
      );
    }
  };

  const acceptFileTransfer = async (notification: NotificationRequest) => {
    deleteNotification(notification.tag);
    acceptRequest(
      notification.data.did,
      notification.data.filetransfer_id,
      notification.data.files,
    );
  };
</script>

<dialog class="right" id="dialog-notifications" bind:this={$notificationDialog}>
  <nav>
    <!-- eslint-disable no-undef -->
    <!-- svelte-ignore missing-declaration -->
    <button
      on:click={() => ui("#dialog-notifications")}
      class="transparent circle large"
    >
      <i>close</i>
    </button>
    <!-- eslint-enable no-undef -->
    <h5 class="max">Notifications</h5>
  </nav>
  <div id="notifications">
    {#each $notifications as n}
      <article
        class="border"
        style="margin: 0; padding: 0; position: relative;"
      >
        {#if n.title == "Receiving file(s)"}
          <progress
            style="margin-top: 7px;"
            class="left"
            value={returnProgress(
              n.data.filetransfer_id,
              $incoming_filetransfers,
            )}
          />
        {/if}

        <div
          style="padding: {n.title == 'Receiving file(s)'
            ? '0'
            : '16px'} 16px 16px 16px;"
        >
          <div class="row">
            <h6>{n.title}</h6>
            <div class="max" />
            <button
              class="transparent circle large"
              on:click={() => deleteNotification(n.tag)}
            >
              <i>close</i>
            </button>
          </div>
          <p>{n.body}</p>
          <nav class="right-align">
            {#if n.title == "File request"}
              <button
                on:click={() =>
                  n.title == "File request" && acceptFileTransfer(n)}
              >
                Accept
              </button>
            {/if}

            {#if n.title == "File received"}
              <a
                class="chip round primary"
                href={n.data.url}
                download={n.data.filename}
              >
                <span>Download</span>
              </a>
            {/if}

            {#if n.title == "File request" || n.title == "Receiving file(s)"}
              <button
                on:click={() =>
                  (n.title == "File request" ||
                    n.title == "Receiving file(s)") &&
                  cancelFiletransfer(n)}
              >
                Cancel
              </button>
            {/if}
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
