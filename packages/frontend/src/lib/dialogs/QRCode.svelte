<script lang="ts">
  import QRCode from "qrcode";

  import { manager } from "$lib/sharing/manager.svelte";
  import { fade } from "svelte/transition";

  let send = $state(true);
  let link: string = $state("");

  const setLink = async () => {
    link = await manager.createGuestTransfer(send);
  };
</script>

<p style="font-size: large; margin-bottom: 12px;">Guest QR code</p>

{#if link}
  {#await QRCode.toDataURL(link)}
    <p>Generating QR code...</p>
  {:then qrCode}
    <div id="link" class="center-align" in:fade={{ duration: 200 }}>
      <img
        style="border-radius: 0.75rem"
        src={qrCode}
        alt="QR Code"
        draggable="false"
      />

      <div>
        <p class="center-align" style="font-size: 150%">Link</p>
        <br />
        <nav class="no-space center-align">
          <button
            onclick={() => navigator.clipboard.writeText(link)}
            class="border left-round"
          >
            <i>content_copy</i>
            <div class="tooltip bottom">Copy link</div>
          </button>
          <button
            onclick={() =>
              navigator.share({
                url: link,
              })}
            class="border right-round"
          >
            <i>share</i>
            <div class="tooltip bottom">Share link</div>
          </button>
        </nav>
      </div>
    </div>
  {:catch}
    <p>Failed to generate QR code.</p>
  {/await}
{:else}
  <p>
    Generate a QR-Code, which can be used to download/receive files without
    needing to register.
  </p>

  <div class="center-align row">
    <label class="checkbox">
      <input bind:checked={send} type="checkbox" />
      <span>Include files</span>
    </label>
    <button onclick={setLink}>Generate</button>
  </div>
{/if}

<style>
  #link {
    display: flex;
    flex-flow: row;
    gap: 30px;
    padding-top: 10px;
  }
</style>
