<script lang="ts">
  import {
    notifications,
    deleteNotification,
    type INotification,
  } from "$lib/lib/UI";
  import { onMount } from "svelte";
  import { writable } from "svelte/store";

  let received_chunks = writable<
    {
      file_id: string;
      file_name: string;
      encrypted: string;
      chunk_number: number;
      chunks: string[];
      url?: string | undefined;
    }[]
  >();

  async function handleNotificationClick(n: INotification, action: string) {
    if (action == "download") {
      window.location.href = n.data;
    }
  }

  const returnProgress = (
    file_id: string,
    received_chunks: {
      file_id: string;
      file_name: string;
      encrypted: string;
      chunk_number: number;
      chunks: string[];
      url?: string;
    }[]
  ) => {
    const file = received_chunks.find(
      (received_chunk) => received_chunk.file_id === file_id
    );

    if (file !== undefined) {
      const progress = (file.chunks.length / file.chunk_number) * 100;

      // eslint-disable-next-line no-undef
      ui(`#file-${file_id}`, progress);
    }

    return "";
  };

  onMount(async () => {
    received_chunks = (await import("$lib/peerjs/common")).received_chunks;
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
        {#if n.title == "Receiving file"}
          <div
            class="progress left {returnProgress(
              n.data.file_id,
              $received_chunks
            )}"
            id="file-{n.data.file_id}"
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
