<script lang="ts">
  import { onMount } from "svelte";

  import { dialogProperties, generalDialog } from "$lib/lib/UI";

  import Add from "$lib/dialogs/Add.svelte";
  import Delete from "$lib/dialogs/Delete.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";
  import Privacy from "$lib/dialogs/Privacy.svelte";
  import PushRequest from "$lib/dialogs/PushRequest.svelte";
  import QrCode from "$lib/dialogs/QRCode.svelte";

  onMount(() =>
    $generalDialog.addEventListener("close", () => {
      if ($dialogProperties.mode !== "unselected")
        setTimeout(() => {
          if (!$generalDialog.open) $dialogProperties.mode = "unselected";
        }, 400); // BeerCSS: --speed3 + 0.1s
    }),
  );
</script>

<dialog
  id="dialog-general"
  bind:this={$generalDialog}
  style={$dialogProperties.mode == "edit" &&
  ($dialogProperties.type == "deviceType" || $dialogProperties.type == "avatar")
    ? "min-height: 250px;"
    : $dialogProperties.mode == "qrcode"
      ? "width: 357px;"
      : undefined}
>
  {#if $dialogProperties.mode == "add"}
    <Add properties={$dialogProperties} />
  {:else if $dialogProperties.mode == "delete"}
    <Delete />
  {:else if $dialogProperties.mode == "edit"}
    <Edit properties={$dialogProperties} />
  {:else if $dialogProperties.mode == "privacy"}
    <Privacy />
  {:else if $dialogProperties.mode == "request"}
    <PushRequest />
  {:else if $dialogProperties.mode == "qrcode"}
    <QrCode />
  {/if}
</dialog>
