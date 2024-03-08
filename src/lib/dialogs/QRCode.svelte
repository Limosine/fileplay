<script lang="ts">
  import QRCode from "qrcode";

  import { senderLink } from "$lib/sharing/common";
</script>

<p style="font-size: large; margin-bottom: 12px;">Guest QR code</p>

{#if $senderLink}
  {#await QRCode.toDataURL($senderLink)}
    <p>Generating QR code...</p>
  {:then qrCode}
    <img
      class="center"
      style="border-radius: 0.75rem"
      src={qrCode}
      alt="QR Code"
    />
  {:catch}
    <p>Failed to generate QR code.</p>
  {/await}
{/if}
