<script lang="ts">
  import dayjs from "dayjs";
  import { onDestroy, onMount } from "svelte";

  import { code, addContactDialog, add_mode } from "$lib/lib/UI";
  import { apiClient } from "$lib/websocket/client";

  let redeemCode_section = true;

  const generateContactCode = async () => {
    // todo refresh this code after specified interval

    const result = await apiClient().sendMessage({ type: "createContactCode" });
    expires_at = result.expires;
    return result;
  };

  const generateDeviceCode = async () => {
    // todo refresh this code after specified interval

    const result = await apiClient().sendMessage({ type: "createDeviceCode" });
    expires_at = result.expires;
    return result;
  };

  let expires_in: number;
  let expires_at: number;
  let updateInterval: any;

  const updateExpiresIn = () => {
    if (expires_at) expires_in = Math.round((expires_at - dayjs().unix()) / 60);
  };

  onMount(() => (updateInterval = setInterval(updateExpiresIn, 1000)));
  onDestroy(() => clearInterval(updateInterval));
</script>

<dialog id="dialog-add" bind:this={$addContactDialog}>
  {#if $add_mode == "contact"}
    <p style="font-size: large; margin-bottom: 10px;">Add contact</p>
    <div id="content">
      <nav class="no-space center-align">
        {#if redeemCode_section}
          <button class="left-round">Redeem code</button>
          <button
            class="right-round border"
            on:click={() => {
              redeemCode_section = false;
            }}
          >
            Generate code
          </button>
        {:else}
          <button
            class="left-round border"
            on:click={() => {
              redeemCode_section = true;
            }}>Redeem code</button
          >
          <button class="right-round"> Generate code </button>
        {/if}
      </nav>
      {#if redeemCode_section}
        <div class="field label border">
          <input type="text" maxlength={6} bind:value={$code} />
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label>Linking code</label>
        </div>
      {:else}
        <br />
        {#await generateContactCode()}
          <p>Generating code...</p>
        {:then codeproperties}
          <p>
            Code: {codeproperties.code}<br />
            Expires in {expires_in === undefined ? 15 : expires_in} m
          </p>
        {:catch}
          <p>Failed to generate code.</p>
        {/await}
      {/if}
    </div>
    <nav class="right-align" style="padding: 10px 0 0 0;">
      <!-- eslint-disable no-undef -->
      <!-- svelte-ignore missing-declaration -->
      <button
        class="border"
        style="border: 0;"
        on:click={() => ui("#dialog-add")}>Cancel</button
      >
      <!-- svelte-ignore missing-declaration -->
      <button
        disabled={$code == ""}
        class="border"
        style="border: 0;"
        on:click={async () => {
          await apiClient().sendMessage({
            type: "redeemContactCode",
            data: $code,
          });
          ui("#dialog-add");
        }}>Add</button
      >
      <!-- eslint-enable no-undef -->
    </nav>
  {:else}
    <p style="font-size: large; margin-bottom: 10px;">Link a new device</p>
    {#await generateDeviceCode()}
      <p>Generating code...</p>
    {:then codeproperties}
      <p>
        Code: {codeproperties.code}<br />
        Expires in {expires_in === undefined ? 15 : expires_in} m
      </p>
    {:catch}
      <p>Failed to generate code.</p>
    {/await}
  {/if}
</dialog>

<style>
  #content {
    display: flex;
    flex-flow: column;
  }
</style>
