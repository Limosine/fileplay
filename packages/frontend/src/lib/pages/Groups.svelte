<script lang="ts">
  import ui from "beercss";

  import { apiClient } from "$lib/api/client";
  import type { IGroup } from "$lib/lib/fetchers";
  import {
    groupDevices,
    groupProperties,
    groups,
    layout,
    user,
  } from "$lib/lib/UI";

  import Button from "$lib/components/Button.svelte";

  let members: IGroup[] = $state([]);
  let requests: IGroup[] = $state([]);

  const loadGroups = () => {
    let membersTemp: IGroup[] = [];
    let requestsTemp: IGroup[] = [];

    for (const group of $groups) {
      if (group.members.some((r) => r.uid == $user.uid)) {
        membersTemp.push(group);
      } else {
        requestsTemp.push(group);
      }
    }

    members = membersTemp;
    requests = requestsTemp;
  };

  $effect(() => loadGroups());
</script>

{#if requests.length > 0}
  <p id="header" class="bold">Requests</p>

  {#each requests as request, index}
    <Button clickable={false}>
      <div id="circle" style="border-color: var(--primary);"></div>

      <div>
        <p id="title">{request.name}</p>
        <p id="subtitle">Click to join the group</p>
      </div>
      <div class="max"></div>
      <button
        class="circle light-green"
        onclick={() =>
          apiClient("ws").sendMessage({
            type: "acceptGroupRequest",
            data: request.gid,
          })}
      >
        <i>done</i>
      </button>
      <button
        class="circle red"
        onclick={() =>
          apiClient("ws").sendMessage({
            type: "deleteGroupMember",
            data: {
              gid: request.gid,
            },
          })}
      >
        <i>close</i>
      </button>
    </Button>

    {#if requests.length !== index + 1}
      <div class="divider"></div>
    {/if}
  {/each}
{/if}

{#each members as member, index}
  {#if index === 0 && ($layout == "desktop" || requests.length > 0)}
    <p
      id="header"
      class="bold"
      style={requests.length > 0 ? "padding-top: 15px;" : ""}
    >
      Groups
    </p>
  {/if}

  {#if index !== 0}
    <div class="divider"></div>
  {/if}

  <Button
    onclick={() => {
      $groupProperties = { mode: "properties", gid: member.gid };
      ui("#dialog-large");
    }}
  >
    {#if $groupDevices.filter((d) => d.gid === member.gid).length < 2}
      <div id="circle" style="border-color: var(--tertiary);"></div>
    {:else}
      <div id="circle" class="green-border">
        {$groupDevices.filter((d) => d.gid === member.gid).length - 1}
      </div>
    {/if}
    <div>
      <p id="title">{member.name}</p>
      <p id="subtitle">
        Contains {member.members.length} member{member.members.length === 1
          ? ""
          : "s"}
      </p>
    </div>
  </Button>
{:else}
  <div class="centered">
    <p class="large-text">No groups available</p>
  </div>
{/each}

<style>
  .centered {
    height: 100%;
    display: flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;
  }

  #circle {
    width: 45px;
    height: 45px;

    line-height: 35px;
    text-align: center;
    font-size: large;

    border: 5px solid;
    border-radius: 50%;
  }

  #header {
    margin: 0 0 5px 0;
    padding: 0 20px;
    color: var(--secondary);
  }
</style>
