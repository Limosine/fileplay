<script lang="ts">
  import { contacts, devices, groups, returnSubstring } from "$lib/lib/UI";
  import { capitalizeFirstLetter } from "$lib/lib/utils";
  import { type IncomingFiletransfer } from "$lib/sharing/common";
  import { manager } from "$lib/sharing/manager.svelte";

  let downloaded: string[] = [];

  const getScope = (did: number, ids: IncomingFiletransfer["ids"]) => {
    if (ids.type == "contact") {
      const contact = $contacts.find((c) => c.uid === ids.id);
      return `Contact "${contact?.display_name}"`;
    } else if (ids.type == "group") {
      const group = $groups.find((g) => g.gid === ids.id);
      return `Group "${group?.name}"`;
    } else if (ids.type == "device") {
      const device = $devices.others.find((d) => d.did === did);
      return `Device "${device?.display_name}"`;
    } else return `Guest "${did}"`;
  };
</script>

<div id="list">
  {#each manager.incoming as transfer, index}
    {#if index === 0}
      <p class="bold" style="color: var(--secondary);">
        Incoming filetransfers:
      </p>
    {/if}

    <article class="secondary-container">
      <div class="row">
        <p class="large-text">Scope: {getScope(transfer.did, transfer.ids)}</p>
        <div class="max"></div>
        {#if transfer.state == "infos"}
          <button
            class="circle light-green"
            on:click={() => transfer.sendAnswer(true)}
          >
            <i>done</i>
          </button>
          <button
            class="circle red"
            on:click={() => transfer.sendAnswer(false)}
          >
            <i>close</i>
          </button>
        {:else if transfer.state == "receiving" || transfer.state == "received"}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_missing_attribute a11y_no_static_element_interactions -->
          <a on:click={() => transfer.sendAnswer(false)} class="clickable">
            {#if transfer.state == "receiving"}
              <p>Cancel</p>
            {:else}
              <p>Delete</p>
            {/if}
          </a>
        {/if}
      </div>
      {#if transfer.state != "infos" && transfer.state != "received"}
        <p>State: {capitalizeFirstLetter(transfer.state)}</p>
      {/if}
      <div id="list" style="padding: 10px 0 0 0;">
        {#each transfer.files as file}
          <article id="file" class="tertiary">
            <div class="row">
              <p>{returnSubstring(file.name, 25)}</p>
              <div class="max"></div>

              {#if downloaded.some((d) => d == file.id)}
                <i style="color: green;">done</i>
              {/if}

              {#if file.url !== undefined}
                <a
                  class="button transparent circle small"
                  on:click={() =>
                    !downloaded.some((d) => d == file.id) &&
                    (downloaded = [...downloaded, file.id])}
                  href={file.url}
                  download={file.name}
                >
                  <i>download</i>
                </a>
              {/if}
            </div>
            {#if transfer.state != "infos" && file.url === undefined}
              {@const progress = transfer.getProgress(file.id)}
              <div class="row">
                <progress
                  style="background-color: var(--outline); color: var(--on-tertiary);"
                  value={progress}
                ></progress>
                <p>{Math.round(progress * 100)}%</p>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </article>
  {/each}
</div>

<style>
  p,
  article,
  .row {
    margin: 0;
  }

  #list {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 0 20px;
  }

  #file {
    padding: 0.5rem 1rem;
  }

  .clickable {
    color: var(--secondary);
    font-weight: bold;
  }
</style>
