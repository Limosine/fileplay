<script lang="ts">
  import Button from "@smui/button";
  import Dialog, { Actions, Content, Title } from "@smui/dialog";
  import Textfield from "@smui/textfield";
  import HelperText from "@smui/select/helper-text";
  import { Icon } from "@smui/common";

  export let assetName: string, // eg. "chromebook"
    assetType: "device" | "user",
    callback: () => void | Promise<void>,
    open: boolean,
    extraParagraph: string = "",
    typingVerification: boolean = false;

  let typingVerificationInput: string = "",
    typingVerificationInputCorrect: boolean = false,
    ctaDisabled: boolean = false;

  $: typingVerificationInputCorrect = typingVerificationInput === assetName;
  $: ctaDisabled = !typingVerification || typingVerificationInputCorrect;
</script>

<Dialog bind:open>
  <Title>Are you sure?</Title>
  <Content>
    <p>
      Are you sure you want to delete the {assetType} "{assetName}"?
    </p>
    {#if extraParagraph}
      <p>{extraParagraph}</p>
    {/if}
    {#if typingVerification}
      <p>
        Please type <strong>{assetName}</strong> below to confirm.
      </p>
      <p>
        <Textfield variant="outlined" bind:value={typingVerificationInput}>
          {#if !typingVerificationInputCorrect}
            <HelperText slot="helper">
              Please type {assetName} to confirm.
            </HelperText>
          {:else}
            <Icon style="color:green" class="material-icons" slot="trailingIcon"
              >check</Icon
            >
          {/if}
        </Textfield>
      </p>
    {/if}
  </Content>
  <Actions>
    <div slot="primaryAction">
      <Button
        bind:disabled={ctaDisabled}
        on:click={async () => {
          await callback();
          open = false;
        }}>Delete</Button
      >
    </div>
    <div slot="secondaryAction">
      <Button
        on:click={() => {
          open = false;
        }}>Cancel</Button
      >
    </div>
  </Actions>
</Dialog>
