<script lang="ts">
  import { apiClient } from "$lib/api/client";
  import {
    contacts,
    groups,
    openEditDialog,
    returnSubstring,
    user as userStore,
  } from "$lib/lib/UI";
  import { getDicebearUrl } from "$lib/lib/common";
  import type { IGroup } from "$lib/lib/fetchers";

  import Button from "./Button.svelte";
  import Fullscreen from "./Fullscreen.svelte";
  import User from "./buttons/User.svelte";

  type User = { uid: number; avatar_seed: string; display_name: string };

  let {
    page = $bindable(),
    selected = $bindable(),
    name = $bindable(),
  }: {
    page: "add" | "name";
    selected: User[];
    name: string;
  } = $props();

  const isSelected = (id: number) => selected.some((s) => s.uid === id);

  const select = (user: User) => {
    const index = selected.findIndex((s) => s.uid === user.uid);
    if (index === -1) selected.push(user);
    else selected.splice(index, 1);

    selected = selected;
  };

  const getGroupMembers = (groups: IGroup[]) => {
    const members: IGroup["members"] = [];

    for (const group of groups) {
      for (const member of group.members) {
        if (
          !members.some((m) => m.uid === member.uid) &&
          !$contacts.some((c) => c.uid === member.uid) &&
          member.uid !== $userStore.uid
        )
          members.push(member);
      }
    }

    return members;
  };
</script>

{#if page == "add"}
  <Fullscreen
    header="New group"
    subheader="Add members"
    forceHeaderVisible={false}
  >
    {#each $contacts as contact, index}
      {#if index === 0}
        <p id="header" class="bold">Contacts</p>
      {/if}

      <User
        user={contact}
        selected={isSelected(contact.uid)}
        on:click={() => select(contact)}
      />
    {/each}

    {#each getGroupMembers($groups) as member, index}
      {#if index === 0}
        <p id="header" class="bold">Group members</p>
      {/if}

      <User
        user={member}
        selected={isSelected(member.uid)}
        on:click={() => select(member)}
      />
    {/each}

    {#snippet footerSnippet()}
      <button
        id="next-button"
        class="square round extra"
        disabled={selected.length < 1}
        onclick={() => (page = "name")}
      >
        <i>arrow_forward</i>
      </button>
    {/snippet}
  </Fullscreen>
{:else}
  <Fullscreen header="New group" backAction={() => (page = "add")}>
    <p id="header" class="bold">Properties</p>

    <Button
      on:click={async () =>
        (name = await openEditDialog(
          {
            title: "Group name",
            placeholder: "Group name",
            type: "string",
          },
          name,
        ))}
    >
      <div>
        <p id="title">Name</p>
        <p id="subtitle">{name ? name : "Specify a group name"}</p>
      </div>
    </Button>

    <p id="header" class="bold">Members: {selected.length}</p>

    <div class="row wrap" style="margin: 10px 20px;">
      {#each selected as user}
        <article
          class="secondary-container"
          style="padding: 10px; text-align: center;"
        >
          <img
            class="circle medium"
            src={getDicebearUrl(user.avatar_seed)}
            style="height: 55px; width: 55px;"
            alt="Avatar"
            draggable="false"
          />

          <p style="margin-bottom: 0;">
            {returnSubstring(user.display_name, 10)}
          </p>
        </article>
      {/each}
    </div>

    {#snippet footerSnippet()}
      <button
        id="next-button"
        class="square round extra"
        disabled={!name || selected.length < 1}
        onclick={() => {
          ui("#dialog-large");
          apiClient("ws").sendMessage({
            type: "createGroup",
            data: { name, members: selected.map((s) => s.uid) },
          });
        }}
      >
        <i>done</i>
      </button>
    {/snippet}
  </Fullscreen>
{/if}

<style>
  #header {
    margin: 0 0 5px;
    padding: 8px 20px 0;
    color: var(--secondary);
  }

  #next-button {
    position: fixed;
    margin: 0;
    bottom: 20px;
    right: 20px;
  }
</style>
