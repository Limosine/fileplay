<script lang="ts">
  import { onMount } from "svelte";

  import "beercss";

  import {
    decryptData,
    encryptData,
    setup,
  } from "$lib/lib/encryption";
  import { blobToArrayBuffer } from "$lib/lib/utils";
  import { createFileURL } from "$lib/sharing/common";

  let files: FileList;

  let link: string;
  let encrypted: Uint8Array;

  const encrypt = async () => {
    Array.from(files).forEach(async (file) => {
      // Encrypt -- Not working
      encrypted = await encryptData(new Uint8Array(await blobToArrayBuffer(file)), 123456);

      // Decrypt
      const decrypted = await decryptData(
        encrypted,
        123456,
      );

      // Download
      link = createFileURL(decrypted);
    });
  };

  onMount(() => {
    setup();
  });
</script>

<div class="grid">
  <div class="s6">
    <h5>Encrypt</h5>

    <button>
      <i>attach_file</i>
      <span>File</span>
      <input type="file" bind:files />
    </button>

    <button on:click={encrypt}>Encrypt</button>

    {#if encrypted}
      <article>
        <p>Encrypted.</p>
      </article>

      {#if link}
        <a class="chip round primary" href={link} download={"file"}>
          <span>Download</span>
        </a>
      {/if}
    {/if}
  </div>
</div>
