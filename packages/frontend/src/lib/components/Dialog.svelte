<script lang="ts">
  import { onMount } from "svelte";

  import { ui_object } from "$lib/lib/UI.svelte";

  import Add from "$lib/dialogs/Add.svelte";
  import Delete from "$lib/dialogs/Delete.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";
  import Privacy from "$lib/dialogs/Privacy.svelte";
  import PushRequest from "$lib/dialogs/PushRequest.svelte";
  import QrCode from "$lib/dialogs/QRCode.svelte";

  onMount(() =>
    ui_object.generalDialog?.addEventListener("close", () => {
      if (ui_object.dialogProperties.mode !== "unselected")
        setTimeout(() => {
          if (
            ui_object.generalDialog !== undefined &&
            !ui_object.generalDialog.open
          )
            ui_object.dialogProperties.mode = "unselected";
        }, 400); // BeerCSS: --speed3 + 0.1s
    }),
  );
</script>

<dialog
  id="dialog-general"
  bind:this={ui_object.generalDialog}
  style={ui_object.dialogProperties.mode == "edit" &&
  (ui_object.dialogProperties.type == "deviceType" ||
    ui_object.dialogProperties.type == "avatar")
    ? "min-height: 250px;"
    : ui_object.dialogProperties.mode == "qrcode"
      ? "width: 357px;"
      : undefined}
>
  {#if ui_object.dialogProperties.mode == "add"}
    <Add properties={ui_object.dialogProperties} />
  {:else if ui_object.dialogProperties.mode == "delete"}
    <Delete />
  {:else if ui_object.dialogProperties.mode == "edit"}
    <Edit properties={ui_object.dialogProperties} />
  {:else if ui_object.dialogProperties.mode == "privacy"}
    <Privacy />
  {:else if ui_object.dialogProperties.mode == "request"}
    <PushRequest />
  {:else if ui_object.dialogProperties.mode == "qrcode"}
    <QrCode />
  {/if}
</dialog>
