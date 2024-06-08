<script lang="ts">
  import dayjs from "dayjs";

  import { apiClient } from "$lib/api/client";
  import { contacts, groups, openDialog, user } from "$lib/lib/UI";

  import Fullscreen from "$lib/components/Fullscreen.svelte";
  import Button from "$lib/components/Button.svelte";
  import User from "$lib/components/buttons/User.svelte";
  import { concatArrays } from "$lib/sharing/common";

  type User = { uid: number; display_name: string; avatar_seed: string };

  let {
    gid,
    page = $bindable(),
  }: {
    gid: number;
    page: "main" | "members" | "requests" | "add";
  } = $props();

  let group = $derived($groups.find((g) => g.gid === gid));

  const selected: User[] = $state([]);

  const isSelected = (id: number) => selected.some((s) => s.uid === id);

  const select = (user: User) => {
    const index = selected.findIndex((s) => s.uid === user.uid);
    if (index === -1) selected.push(user);
    else selected.splice(index, 1);
  };

  const filterContacts = () =>
    $contacts.filter(
      (c) =>
        !group?.members.some((m) => m.uid === c.uid) &&
        !group?.requests.some((r) => r.uid === c.uid),
    );

  const filterGroupMembers = (contacts: typeof $contacts) => {
    const users = concatArrays(
      $groups.map((g) => (g.members as User[]).concat(g.requests)),
    );

    return users.filter(
      (u) =>
        !group?.members.some((m) => m.uid === u.uid) &&
        !group?.requests.some((r) => r.uid === u.uid) &&
        !contacts.some((c) => c.uid === u.uid),
    );
  };
</script>

{#if group !== undefined}
  {#if page == "main"}
    <Fullscreen header={group.name}>
      {@const owner = group.members.find(
        (m) => group !== undefined && m.uid === group.oid,
      )}

      {#if owner !== undefined}
        <p id="header" class="bold">Owner</p>

        <Button clickable={false}>
          <div>
            <p id="title">
              {owner.display_name}
            </p>
            <p id="subtitle">
              Created at {dayjs
                .unix(owner.joined_at)
                .format("DD.MM.YYYY, HH:mm")}.
            </p>
          </div>
        </Button>

        <p id="header" class="bold">Members</p>

        <Button onclick={() => (page = "members")}>
          <div>
            <p id="title">Members</p>
            <p id="subtitle">
              Contains {group.members.length} member{group.members.length === 1
                ? ""
                : "s"}
            </p>
          </div>
        </Button>

        <div class="divider"></div>

        <Button onclick={() => (page = "requests")}>
          <div>
            <p id="title">Requests</p>
            <p id="subtitle">
              {group.requests.length === 0
                ? "No pending requests"
                : `${group.requests.length} pending request${group.requests.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </Button>

        <div class="divider"></div>

        <Button
          onclick={async () => {
            if (group !== undefined && (await openDialog({ mode: "delete" }))) {
              ui("#dialog-large");
              apiClient("ws").sendMessage({
                type: "deleteGroupMember",
                data: { gid: group.gid },
              });
            }
          }}
        >
          <div style="color: red;">
            <p id="title">
              {owner.uid === $user.uid ? "Delete" : "Leave"} group
            </p>
            <p id="subtitle"></p>
          </div>
        </Button>
      {/if}
    </Fullscreen>
  {:else if page == "members"}
    <Fullscreen header="Members" backAction={() => (page = "main")}>
      {#each group.members as member, index}
        {#if index !== 0}
          <div class="divider"></div>
        {/if}

        <User
          user={member}
          subtitle="Joined at {dayjs
            .unix(member.joined_at)
            .format('DD.MM.YYYY, HH:mm')}."
          onclick={async () => {
            if ((await openDialog({ mode: "delete" })) && group !== undefined) {
              if (group.oid === $user.uid) ui("#dialog-large");

              apiClient("ws").sendMessage({
                type: "deleteGroupMember",
                data: { gid: group.gid, deletion: member.uid },
              });
            }
          }}
        />
      {/each}
    </Fullscreen>
  {:else if page == "requests"}
    <Fullscreen header="Requests" backAction={() => (page = "main")}>
      {#each group.requests as request, index}
        {#if index !== 0}
          <div class="divider"></div>
        {/if}

        <User
          user={request}
          subtitle="Created at {dayjs
            .unix(request.created_at)
            .format('DD.MM.YYYY, HH:mm')}."
          onclick={async () =>
            (await openDialog({ mode: "delete" })) &&
            group !== undefined &&
            apiClient("ws").sendMessage({
              type: "deleteGroupMember",
              data: { gid: group.gid, deletion: request.uid },
            })}
        />
      {/each}

      {#snippet footerSnippet()}
        <button
          id="next-button"
          class="square round extra"
          onclick={() => (page = "add")}
        >
          <i>add</i>
        </button>
      {/snippet}
    </Fullscreen>
  {:else if page == "add"}
    <Fullscreen
      header="Invite new users"
      backAction={() => (page = "requests")}
    >
      {@const contacts = filterContacts()}
      {#each contacts as contact, index}
        {#if index === 0}
          <p id="header" class="bold">Contacts</p>
        {/if}

        <User
          user={contact}
          selected={isSelected(contact.uid)}
          onclick={() => select(contact)}
        />
      {/each}

      {#each filterGroupMembers(contacts) as member, index}
        {#if index === 0}
          <p id="header" class="bold">Group members</p>
        {/if}

        <User
          user={member}
          selected={isSelected(member.uid)}
          onclick={() => select(member)}
        />
      {/each}

      {#snippet footerSnippet()}
        <button
          id="next-button"
          class="square round extra"
          onclick={() => {
            page = "requests";
            group !== undefined &&
              apiClient("ws").sendMessage({
                type: "createGroupRequest",
                data: {
                  gid: group.gid,
                  uIds: selected.map((s) => s.uid),
                },
              });
            selected.length = 0;
          }}
        >
          <i>done</i>
        </button>
      {/snippet}
    </Fullscreen>
  {/if}
{/if}

<style>
  #header {
    margin: 0 0 5px 0;
    padding: 0 20px;
    color: var(--secondary);
  }

  #next-button {
    position: fixed;
    margin: 0;
    bottom: 20px;
    right: 20px;
  }
</style>
