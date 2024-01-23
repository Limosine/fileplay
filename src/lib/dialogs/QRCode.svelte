<script lang="ts">
  import { qrCodeDialog, generateQRCode } from "$lib/lib/UI";
  import { senderLink } from "$lib/sharing/common";
</script>

<dialog id="dialog-qrcode" bind:this={$qrCodeDialog}>
  <p style="font-size: large; margin-bottom: 10px;">Guest QR code</p>
  {#if $senderLink}
    {#await generateQRCode($senderLink)}
      <p>Generating QR code...</p>
    {:then qrCode}
      <img class="center" style="border-radius: 0.75rem" src={qrCode} alt="QR Code" />
    {:catch}
      <p>Failed to generate QR code.</p>
    {/await}
  {/if}
</dialog>
