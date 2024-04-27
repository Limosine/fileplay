<script lang="ts">
  import { fade } from "svelte/transition";

  import type { IContact, IDevices, IGroup } from "$lib/lib/fetchers";
  import {
    deleteHistory,
    getFrequently as getFrequentlyUnwrapped,
    getRecently as getRecentlyUnwrapped,
  } from "$lib/lib/history";
  import { contacts, devices, groups } from "$lib/lib/UI";
  import { manager } from "$lib/sharing/manager.svelte";

  import Fullscreen from "./Fullscreen.svelte";
  import Device from "./buttons/Device.svelte";
  import Group from "./buttons/Group.svelte";
  import User from "./buttons/User.svelte";

  type HistoryArray = Awaited<ReturnType<typeof getFrequentlyUnwrapped>>;

  interface Selection {
    type: HistoryArray[0]["type"];
    id: number;
    name: string;
  }

  let ownDevicesSelected = $state(false);
  let selected = $state<Selection[]>([]);

  let frequently = $state<HistoryArray>([]);
  let recently = $state<HistoryArray>([]);

  const getFrequently = async () => {
    frequently = await filterHistory(await getFrequentlyUnwrapped());
  };

  const getRecently = async () => {
    recently = (await filterHistory(await getRecentlyUnwrapped())).filter(
      (r) => !frequently.some((f) => f.type == r.type && f.id === r.id),
    );
  };

  const filterHistory = async (history: HistoryArray) => {
    const filter = async () => {
      const array = [];

      for (const f of history) {
        if (
          (f.type == "contact" && $contacts.some((c) => c.uid === f.id)) ||
          (f.type == "group" && $groups.some((g) => g.gid === f.id)) ||
          (f.type == "device" && $devices.others.some((d) => d.did === f.id))
        )
          array.push(f);
        else {
          await deleteHistory(f.type, f.id);
          getFrequently();
          break;
        }
      }

      return array;
    };

    if ($devices !== undefined) return filter();
    else {
      return new Promise<HistoryArray>((resolve) => {
        const unsubscribe = devices.subscribe(async (devices) => {
          if (devices !== undefined) {
            unsubscribe();
            resolve(await filter());
          }
        });
      });
    }
  };

  const filterContacts = (
    contacts: IContact[],
    frequently: HistoryArray,
    recently: HistoryArray,
  ) =>
    contacts.filter(
      (c) =>
        !recently.some((r) => r.type == "contact" && r.id === c.uid) &&
        (frequently === undefined ||
          !frequently.some((f) => f.type == "contact" && f.id === c.uid)),
    );

  const filterDevices = (
    devices: IDevices["others"],
    frequently: HistoryArray,
    recently: HistoryArray,
  ) =>
    devices.filter(
      (d) =>
        !recently.some((r) => r.type == "device" && r.id === d.did) &&
        (frequently === undefined ||
          !frequently.some((f) => f.type == "device" && f.id === d.did)),
    );

  const filterGroups = (
    groups: IGroup[],
    frequently: HistoryArray,
    recently: HistoryArray,
  ) =>
    groups.filter(
      (g) =>
        !recently.some((r) => r.type == "group" && r.id === g.gid) &&
        (frequently === undefined ||
          !frequently.some((f) => f.type == "group" && f.id === g.gid)),
    );

  const isSelected = (type: Selection["type"], id: number) => {
    const item = selected.find((s) => s.type == type && s.id === id);
    return item === undefined ? false : true;
  };

  const select = (type: Selection["type"], name: string, id: number) => {
    const index = selected.findIndex((s) => s.type == type && s.id === id);
    if (index === -1)
      selected.push({
        type,
        id,
        name,
      });
    else selected.splice(index, 1);
  };

  const send = () => {
    const devices = selected.filter((s) => s.type == "device").map((d) => d.id);
    if (devices.length > 0)
      manager.createTransfer({ type: "devices", ids: devices });

    for (const selection of selected.filter((s) => s.type != "device")) {
      if (selection.type == "contact" || selection.type == "group")
        manager.createTransfer({ type: selection.type, id: selection.id });
    }

    ui("#dialog-large");
    setTimeout(async () => {
      selected = [];
      await getFrequently();
      getRecently();
    }, 400); // BeerCSS: --speed3 + 0.1s
  };
</script>

{#snippet switcher(type: "group" | "device" | "contact", id: number)}
  {#if type == "contact"}
    {@const c = $contacts.find((c) => c.uid == id)}
    {#if c !== undefined}
      <User
        lastSeen
        user={c}
        selected={isSelected("contact", c.uid)}
        on:click={() => select("contact", c.display_name, c.uid)}
      />
    {/if}
  {:else if type == "group"}
    {@const g = $groups.find((g) => g.gid == id)}
    {#if g !== undefined}
      <Group
        lastSeen
        group={g}
        selected={isSelected("group", g.gid)}
        on:click={() => select("group", g.name, g.gid)}
      />
    {/if}
  {:else}
    {@const d = $devices?.others.find((d) => d.did == id)}
    {#if d !== undefined}
      <Device
        lastSeen
        device={d}
        selected={isSelected("device", d.did)}
        on:click={() => select("device", d.display_name, d.did)}
      />
    {/if}
  {/if}
{/snippet}

{#snippet deviceButton()}
  <div class="max"></div>

  <label class="switch icon" style="margin: 8px;">
    <input type="checkbox" bind:checked={ownDevicesSelected} />
    <span><i>devices</i></span>
    <div class="tooltip left">Own devices</div>
  </label>
{/snippet}

<Fullscreen
  header="Send to..."
  headerSnippet={deviceButton}
  footerVisible={selected.length > 0}
>
  {#await getFrequently() then}
    {#if frequently.length > 0}
      <p id="header" class="bold">Frequently shared with</p>
    {/if}

    {#each frequently as element, index}
      {#if index > 0}
        <div class="divider"></div>
      {/if}

      {@render switcher(element.type, element.id)}
    {/each}

    {#await getRecently() then}
      {#each recently as element, index}
        {#if index === 0}
          <p id="header" class="bold">Recently shared with</p>
        {/if}

        {@render switcher(element.type, element.id)}
      {/each}

      {#if ownDevicesSelected && $devices !== undefined}
        {#each filterDevices($devices.others, frequently, recently) as d, index}
          {#if index === 0}
            <p id="header" class="bold">Own devices</p>
          {/if}

          <Device
            lastSeen
            device={d}
            selected={isSelected("device", d.did)}
            on:click={() => select("device", d.display_name, d.did)}
          />
        {/each}
      {:else if !ownDevicesSelected}
        {#each filterGroups($groups, frequently, recently) as g, index}
          {#if index === 0}
            <p id="header" class="bold">Groups</p>
          {/if}

          <Group
            lastSeen
            group={g}
            selected={isSelected("group", g.gid)}
            on:click={() => select("group", g.name, g.gid)}
          />
        {/each}

        {#each filterContacts($contacts, frequently, recently) as c, index}
          {#if index === 0}
            <p id="header" class="bold">Contacts</p>
          {/if}

          <User
            lastSeen
            user={c}
            selected={isSelected("contact", c.uid)}
            on:click={() => select("contact", c.display_name, c.uid)}
          />
        {/each}
      {/if}
    {/await}
  {/await}

  {#if !$contacts.length && !$groups.length}
    {#if !$devices?.others.length}
      <div class="centered">
        <p class="large-text">No contacts, groups or devices available</p>
      </div>
    {:else if !frequently.length && !recently.length}
      <div class="centered">
        <p class="large-text">Own devices available, toggle the switch!</p>
      </div>
    {/if}
  {/if}

  {#snippet footerSnippet()}
    {#if selected.length > 0}
      <div id="footer" class="row" transition:fade={{ duration: 150 }}>
        <p id="selection-text" class="large-text">
          {selected.map((s) => s.name).join(", ")}
        </p>

        <div class="max"></div>
        <button id="send-button" class="circle extra" onclick={send}>
          <i class="large">send</i>
        </button>
      </div>
    {/if}
  {/snippet}
</Fullscreen>

<style>
  .centered {
    height: calc(100% - 152px); /* Header + Title */
    display: flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;
  }

  #footer {
    height: 80px;
    margin-top: auto;

    background-color: var(--surface-container);
    color: var(--on-surface);
  }

  #send-button {
    margin: 12px;
  }

  #selection-text {
    margin-left: 25px;
  }

  #header {
    margin: 0 0 5px;
    padding: 8px 20px 0;
    color: var(--secondary);
  }
</style>
