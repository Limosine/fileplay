<script lang="ts">
  import { get } from "svelte/store";

  import {
    notifications,
    deleteNotification,
    type INotification,
    addNotification,
    returnProgress,
    notificationDialog,
    contacts,
  } from "$lib/lib/UI";
  import {
    incoming_filetransfers,
    type FileInfos,
    type IncomingFiletransfer,
  } from "$lib/sharing/common";
  import { sendAccept } from "$lib/sharing/send";

  async function handleNotificationClick(n: INotification, action: string) {
    if (action == "download") {
      window.location.href = n.data;
    } else if (action == "accept") {
      acceptFileTransfer(n);
    } else if (action == "cancel") {
      incoming_filetransfers.update((filetransfers) =>
        filetransfers.filter(
          (filetransfer) => filetransfer.id != n.data.filetransfer_id,
        ),
      );
    }

    if (action != "download") {
      deleteNotification(n.tag);
    }
  }

  const acceptFileTransfer = async (notification: INotification) => {
    let files: FileInfos[] = [];

    notification.data.files.forEach((file: FileInfos) => {
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
      encrypted: notification.data.encrypted,
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
      actions: [{ title: "Cancel", action: "cancel" }],
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
            {#each n.actions ?? [] as action}
              {#if action.action == "download"}
                <a
                  class="chip round primary"
                  href={n.data.url}
                  download={n.data.filename}
                >
                  <span>Download</span>
                </a>
              {:else}
                <button
                  on:click={() => handleNotificationClick(n, action.action)}
                >
                  {action.title}
                </button>
              {/if}
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
