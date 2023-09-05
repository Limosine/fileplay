<script lang="ts">
  import { codehostname, addContactDialog } from "$lib/lib/UI";
  import { onDestroy, onMount } from "svelte";
  import dayjs from "dayjs";
  import { getCombined } from "$lib/lib/fetchers";

  let hostname: string;
  let code = "";

  let redeemCode_section = true;

  function setHostname() {
    if ($codehostname.includes("@")) {
      hostname = $codehostname.slice($codehostname.search("@") + 1);
      code = $codehostname.slice(0, $codehostname.search("@"));
    } else {
      code = $codehostname;
    }
  }

  async function redeemCode() {
    var link = "/api/contacts/link";
    if (hostname) {
      link = "https://" + hostname + link;
    }

    await fetch(link, {
      method: "POST",
      body: JSON.stringify({ code: code }),
    });
    await getCombined(["contacts"]);
  }

  async function generateCode(): Promise<{
    code: string;
    expires: number;
    refresh: number;
  }> {
    // todo refresh this code after specified interval

    const res = await fetch("/api/contacts/link", {
      method: "GET",
    });

    const codeproperties = (await res.json()) as any;
    expires_at = codeproperties.expires;

    return codeproperties;
  }

  let expires_in: number;
  let expires_at: number;
  let updateInterval: any;

  function updateExpiresIn() {
    if (expires_at) expires_in = Math.round((expires_at - dayjs().unix()) / 60);
  }

  onMount(() => (updateInterval = setInterval(updateExpiresIn, 1000)));
  onDestroy(() => clearInterval(updateInterval));
</script>

<dialog
  id="dialog-add"
  bind:this={$addContactDialog}
>
  <p style="font-size: large; margin-bottom: 10px;">Add contact</p>
  <div id="content">
    <nav class="no-space center-align">
      {#if redeemCode_section}
        <button class="left-round">Redeem code</button>
        <button
          class="right-round border"
          on:click={() => {
            redeemCode_section = false;
            generateCode();
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
        <input
          type="text"
          maxlength={6}
          bind:value={$codehostname}
          on:input={() => setHostname()}
        />
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>Linking code</label>
      </div>
    {:else}
      <br />
      {#await generateCode()}
        <p>Generating code...</p>
      {:then codeproperties}
        <p>
          Code: {codeproperties.code}<br />
          Expires in {expires_in} m
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
      on:click={() => ui("#dialog-add")}
      >Cancel</button
    >
    <!-- svelte-ignore missing-declaration -->
    <button
      disabled={code == ""}
      class="border"
      style="border: 0;"
      on:click={() => {setHostname(); redeemCode(); ui("#dialog-add");}}
      >Add</button
    >
    <!-- eslint-enable no-undef -->
  </nav>
</dialog>

<style>
  #content {
    display: flex;
    flex-flow: column;
  }
</style>
