<script lang="ts">
  import { nanoid } from "nanoid";

  import { files, input, rawFiles } from "$lib/lib/UI";

  const update = (rawFiles: FileList) => {
    const tempFiles: { id: string; file: File }[] = [];

    Array.from(rawFiles).forEach((file) => {
      const index = $files.findIndex((f) => f.file == file);
      if (index === -1) tempFiles.push({ id: nanoid(), file });
      else tempFiles.push($files[index]);
    });

    $files = tempFiles;
  };

  $: {
    if ($rawFiles !== undefined) {
      update($rawFiles);
    }
  }
</script>

<!-- svelte-ignore component_name_lowercase -->
<input type="file" bind:this={$input} bind:files={$rawFiles} multiple />

<style>
  input {
    display: none;
  }
</style>
