<script lang="ts">
  import {
    notifications,
    deleteNotification,
    type INotification,
    deviceInfos,
    addNotification,
  } from "$lib/lib/UI";
  import { incoming_filetransfers } from "$lib/peerjs/common";
  import { onMount } from "svelte";
  import { get } from "svelte/store";

  let sendAccept: (peerID: string, filetransfer_id: string) => void;

  async function handleNotificationClick(n: INotification, action: string) {
    if (action == "download") {
      window.location.href = n.data;
    } else if (action == "accept") {
      acceptFileTransfer(n);
    } else if (action == "cancel") {
      incoming_filetransfers.update((filetransfers) =>
        filetransfers.filter((filetransfer) => filetransfer.filetransfer_id != n.data.filetransfer_id)
      );
    }

    if (action != "download") {
      deleteNotification(n.tag);
    }
  }

  const returnProgress = (
    filetransfer_id: string,
    filetransfers: IIncomingFiletransfer[]
  ) => {
    const filetransfer = filetransfers.find(
      (filetransfer) => filetransfer.filetransfer_id === filetransfer_id
    );
    
    if (filetransfer !== undefined) {
      let received_chunks = 0;
      let total_chunks = 0;

      filetransfer.files.forEach((file) => {
        received_chunks = received_chunks + file.chunks.length;
        total_chunks = total_chunks + file.chunk_number;
      });

      const progress = (received_chunks/ total_chunks) * 100;

      // eslint-disable-next-line no-undef
      ui(`#filetransfer-${filetransfer_id}`, progress);
    }

    return "";
  };

  const acceptFileTransfer = async (notification: INotification) => {
    let files: IIncomingFiletransfer["files"] = [];

    notification.data.files.forEach((file: IFileInfo) => {
      files.push({
        file_id: file.file_id,
        file_name: file.file_name,
        chunk_number: file.chunk_number,
        chunks: [],
      });
    });

    const contact = (await $deviceInfos).find((device) => device.did == notification.data.did);
    const cid = (contact !== undefined) ? contact.cid : undefined;

    const filetransfer: IIncomingFiletransfer = {
      filetransfer_id: notification.data.filetransfer_id,
      encrypted: notification.data.encrypted,
      completed: false,
      files,
      did: notification.data.did,
      cid,
    };

    incoming_filetransfers.set([ ...get(incoming_filetransfers), filetransfer]);

    sendAccept(notification.data.peerID, notification.data.filetransfer_id);

    addNotification({title: "Receiving file(s)", body: `The file(s) '${filetransfer.files.map(file => file.file_name).toString()}' is/are being received.`, tag: `filetransfer-${filetransfer.filetransfer_id}`, actions: [{title: "Cancel", action: "cancel"}], data: { filetransfer_id: filetransfer.filetransfer_id }});
  };

  onMount(async () => {
    sendAccept = (await import("$lib/peerjs/send")).sendAccept;
  });
</script>

<dialog class="right" id="dialog-notifications">
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
          <div
            class="progress left {returnProgress(
              n.data.filetransfer_id,
              $incoming_filetransfers
            )}"
            id="filetransfer-{n.data.filetransfer_id}"
          />
        {/if}
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
