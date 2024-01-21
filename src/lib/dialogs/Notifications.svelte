<script lang="ts">
  import { get } from "svelte/store";

  import {
    notifications,
    deleteNotification,
    addNotification,
    returnProgress,
    notificationDialog,
    contacts,
    type NotificationRequest,
    type NotificationReceiving,
  } from "$lib/lib/UI";
  import {
    incoming_filetransfers,
    type IncomingFiletransfer,
    type Request,
  } from "$lib/sharing/common";
  import { sendAccept } from "$lib/sharing/send";

  const cancelFiletransfer = async (
    notification: NotificationRequest | NotificationReceiving,
  ) => {
    deleteNotification(notification.tag);
    incoming_filetransfers.update((filetransfers) =>
      filetransfers.filter(
        (filetransfer) => filetransfer.id != notification.data.filetransfer_id,
      ),
    );
  };

  const acceptFileTransfer = async (notification: NotificationRequest) => {
    deleteNotification(notification.tag);
    let files: IncomingFiletransfer["files"] = [];

    notification.data.files.forEach((file: Request["files"][0]) => {
      files.push({
        id: file.id,
        name: file.name,
        chunks_length: file.chunks_length,
        chunks: [],
      });
    });

    const contact = get(contacts).find(
      (contact) =>
        contact.devices.find(
          (device) => device.did == notification.data.did,
        ) !== undefined,
    );
    const cid = contact !== undefined ? contact.cid : undefined;

    const filetransfer: IncomingFiletransfer = {
      id: notification.data.filetransfer_id,
      completed: false,
      files,
      did: notification.data.did,
      cid,
    };

    incoming_filetransfers.set([...get(incoming_filetransfers), filetransfer]);

    addNotification({
      title: "Receiving file(s)",
      body: `The file(s) '${filetransfer.files
        .map((file) => file.name)
        .toString()}' is/are being received.`,
      tag: `filetransfer-${filetransfer.id}`,
      data: { filetransfer_id: filetransfer.id },
    });

    sendAccept(notification.data.did, notification.data.filetransfer_id);
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
