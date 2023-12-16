<script lang="ts">
  import "beercss";
  import "material-dynamic-colors";

  import { onMount } from "svelte";
  import { files } from "$lib/components/Input.svelte";
  import { goto } from "$app/navigation";
  import { writable } from "svelte/store";

  const loaded = writable(false);
  const cachedFiles = writable<FileList>();

  onMount(async () => {
    const cache = await caches.open("shared-files");
    const responses = await cache.matchAll("shared-file");
    const dataTransfer = new DataTransfer();

    responses.forEach(async response => {
      dataTransfer.items.add(new File([await response.blob()], 'file.txt', {type: 'text/plain'}));
    });

    $cachedFiles = dataTransfer.files;
    $loaded = true;
    console.log($cachedFiles);

    await cache.delete("shared-file");
  });

  const shareFiles = () => {
    $files = $cachedFiles;
    goto("/");
  };

  const returnSubstring = (file_name: string) => {
    let position = file_name.lastIndexOf(".");

    if (position != -1) {
      let end = file_name.slice(position);

      return file_name.slice(0, 25 - end.length) + end;
    }
  };
</script>

<article style="width: 300px" class="center middle">
  <h5 class="center-align">Fileplay</h5>
  <nav class="center-align">
    <button style="width: 25%" on:click={() => goto("/")}>Cancel</button>
    <button style="width: 25%" on:click={() => shareFiles()}>Share</button>
  </nav>

  <p class="small"><br /></p>

  {#if $loaded}
    <p>Loaded!</p>
    <p>{$cachedFiles}</p>
    {#each $cachedFiles as file}
      <div style="margin-bottom: 5px;">
        <div class="no-space row center-align">
          <article class="border round" style="width: 100%; height: 50px;">
            <span>
              {file.name.length > 25
              ? returnSubstring(file.name)
              : file.name}
            </span>
            <div class="tooltip">{file.name}</div>
          </article>
        </div>
      </div>
    {/each}
  {:else}
      <p>Not yet loaded!</p>
  {/if}
</article>

<style>
  p.small {
    line-height: 0.2;
  }
</style>
