<script lang="ts">
  import dayjs from "dayjs";
  import { onDestroy, onMount } from "svelte";

  import { apiClient } from "$lib/api/client";
  import { closeDialog, type DialogAdd } from "$lib/lib/UI";

  let {
    properties,
  }: {
    properties: DialogAdd;
  } = $props();

  let code = $state("");
  let redeem = $state(true);

  let infos:
    | {
        code: string;
        expires: number;
        refresh: number;
      }
    | undefined = $state();

  let requested = false;
  let expires_in: number | undefined = $state();
  let updateInterval: NodeJS.Timeout;

  const generateContactCode = async () => {
    requested = true;

    infos = await apiClient("ws").sendMessage({
      type: "createContactCode",
    });

    requested = false;
  };

  const generateDeviceCode = async () => {
    requested = true;

    infos = await apiClient("ws").sendMessage({
      type: "createDeviceCode",
    });

    requested = false;
  };

  // TODO: Manual refresh, copy button
  const refreshCode = () => {
    if (properties.addMode == "contact") generateContactCode();
    else generateDeviceCode();
  };

  const updateExpiresIn = () => {
    if (infos !== undefined) {
      expires_in = Math.round((infos.expires - dayjs().unix()) / 60);
      if (!requested && expires_in <= 0) {
        refreshCode();
      }
    }
  };

  onMount(() => (updateInterval = setInterval(updateExpiresIn, 1000)));
  onDestroy(() => clearInterval(updateInterval));
</script>

{#if properties.addMode == "contact"}
  <p style="font-size: large; margin-bottom: 10px;">Add contact</p>
  <div id="content">
    <nav class="no-space center-align">
      {#if redeem}
        <button class="left-round">Redeem code</button>
        <button
          class="right-round border"
          onclick={() => {
            redeem = false;
          }}
        >
          Generate code
        </button>
      {:else}
        <button
          class="left-round border"
          onclick={() => {
            redeem = true;
          }}>Redeem code</button
        >
        <button class="right-round"> Generate code </button>
      {/if}
    </nav>
    {#if redeem}
      <div class="field label border">
        <input type="text" maxlength={6} bind:value={code} />
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label>Linking code</label>
      </div>
    {:else}
      <br />
      {#await generateContactCode()}
        <p>Generating code...</p>
      {:then}
        {#if infos !== undefined}
          <p>
            Code: {infos.code}<br />
            Expires in {expires_in === undefined ? 15 : expires_in} m
          </p>
        {/if}
      {:catch}
        <p>Failed to generate code.</p>
      {/await}
    {/if}
  </div>
  <nav class="right-align" style="padding: 10px 0 0 0;">
    <button class="transparent link" onclick={() => closeDialog()}
      >Cancel</button
    >
    <button
      disabled={code == ""}
      class="transparent link"
      onclick={async () => {
        await apiClient("ws").sendMessage({
          type: "redeemContactCode",
          data: code,
        });
        closeDialog(true);
      }}>Add</button
    >
  </nav>
{:else}
  <p style="font-size: large; margin-bottom: 10px;">Link a new device</p>
  {#await generateDeviceCode()}
    <p>Generating code...</p>
  {:then}
    {#if infos !== undefined}
      <p>
        Code: {infos.code}<br />
        Expires in {expires_in === undefined ? 15 : expires_in} m
      </p>
    {/if}
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
