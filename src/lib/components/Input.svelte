<script lang="ts" context="module">
  import { nanoid } from "nanoid";
  import { get, writable } from "svelte/store";

  export const input = writable<HTMLInputElement>();
  const rawFiles = writable<FileList>();

  export const files = writable<
    {
      id: string;
      file: File;
      bigChunks?: Blob[];
      smallChunks?: Uint8Array[][];
    }[]
  >([]);

  export const click = (action: "click" | FileList) => {
    if (action == "click") get(input).click();
    else {
      rawFiles.set(action);
    }

    const tempFiles: { id: string; file: File }[] = [];

    Array.from(get(rawFiles)).forEach((file) => {
      const index = get(files).findIndex((f) => f.file == file);
      if (index === -1) tempFiles.push({ id: nanoid(), file });
      else tempFiles.push(get(files)[index]);
    });

    files.set(tempFiles);
  };
</script>

<input type="file" bind:this={$input} bind:files={$rawFiles} multiple />

<style>
  input {
    display: none;
  }
</style>
