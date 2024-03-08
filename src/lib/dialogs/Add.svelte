<script lang="ts">
  import dayjs from "dayjs";
  import { onDestroy, onMount } from "svelte";

  import { apiClient } from "$lib/api/client";
  import { addProperties, closeDialog } from "$lib/lib/UI";

  let expires_in: number;
  let expires_at: number;
  let updateInterval: NodeJS.Timeout;

  const generateContactCode = async () => {
    const result = await apiClient("ws").sendMessage({
      type: "createContactCode",
    });
    expires_at = result.expires;
    return result;
  };

  const generateDeviceCode = async () => {
    const result = await apiClient("ws").sendMessage({
      type: "createDeviceCode",
    });
    expires_at = result.expires;
    return result;
  };

  const updateExpiresIn = () => {
    if (expires_at) expires_in = Math.round((expires_at - dayjs().unix()) / 60);
  };

  onMount(() => {
    updateInterval = setInterval(updateExpiresIn, 1000);

    // TODO: Set interval on open, clear on close; refresh code if expired
  });
  onDestroy(() => clearInterval(updateInterval));
</script>

{#if $addProperties.mode == "contact"}
  <p style="font-size: large; margin-bottom: 10px;">Add contact</p>
  <div id="content">
    <nav class="no-space center-align">
      {#if $addProperties.redeem}
        <button class="left-round">Redeem code</button>
        <button
          class="right-round border"
          on:click={() => {
            $addProperties.redeem = false;
          }}
        >
          Generate code
        </button>
      {:else}
        <button
          class="left-round border"
          on:click={() => {
            $addProperties.redeem = true;
          }}>Redeem code</button
        >
        <button class="right-round"> Generate code </button>
      {/if}
    </nav>
    {#if $addProperties.redeem}
      <div class="field label border">
        <input type="text" maxlength={6} bind:value={$addProperties.code} />
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
    <button class="border" style="border: 0;" on:click={() => closeDialog()}
      >Cancel</button
    >
    <!-- svelte-ignore missing-declaration -->
    <button
      disabled={$addProperties.code == ""}
      class="border"
      style="border: 0;"
      on:click={async () => {
        await apiClient("ws").sendMessage({
          type: "redeemContactCode",
          data: $addProperties.code,
        });
        closeDialog();
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

<style>
  #content {
    display: flex;
    flex-flow: column;
  }
</style>
