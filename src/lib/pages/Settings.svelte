<script lang="ts">
  import dayjs from "dayjs";
  import { nanoid } from "nanoid";

  import { apiClient } from "$lib/api/client";
  import { DeviceType, getDicebearUrl } from "$lib/lib/common";
  import { type IDevices } from "$lib/lib/fetchers";
  import {
    changePath,
    deviceParams,
    devices,
    layout,
    openDialog,
    path,
    user,
    userParams,
    type RouteSettings,
    largeDialog,
    generalDialog,
    dialogProperties,
    closeDialog,
    openEditDialog,
  } from "$lib/lib/UI";

  import Button from "$lib/components/Button.svelte";

  const blur = (device: IDevices["self"], mode: "type" | "name") => {
    if (
      (mode == "name" &&
        $deviceParams[device.did].display_name != device.display_name) ||
      (mode == "type" && $deviceParams[device.did].type != device.type)
    )
      apiClient("ws").sendMessage({
        type: "updateDevice",
        data: {
          update:
            mode == "name"
              ? {
                  display_name: $deviceParams[device.did].display_name,
                }
              : {
                  type: $deviceParams[device.did].type as DeviceType,
                },
          did: device.did,
        },
      });
  };

  $effect(() => {
    // Open dialog
    if (
      $layout == "mobile" &&
      ($path as RouteSettings).sub &&
      $largeDialog &&
      !$largeDialog.open
    )
      ui("#dialog-large");

    // Close dialogs
    if (
      ($layout == "desktop" || !($path as RouteSettings).sub) &&
      $largeDialog &&
      $largeDialog.open
    )
      ui("#dialog-large");
    if (
      $layout == "desktop" &&
      $dialogProperties.mode == "edit" &&
      $generalDialog.open
    )
      closeDialog();
  });
</script>

{#if $layout == "desktop"}
  <div style="padding: 20px;">
    <article style="padding: 15px 12px;" class="secondary-container">
      <div class="row">
        <h6>Settings</h6>
        <div class="max"></div>
        {#if "sub" in $path && $path.sub == "devices"}
          <!-- svelte-ignore a11y_missing_attribute, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <a
            class="chip primary round"
            onclick={() => openDialog({ mode: "add", addMode: "device" })}
            >Link device</a
          >
        {/if}
      </div>
      <div>
        <!-- svelte-ignore a11y_missing_attribute, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="tabs">
          <a
            class={($path as RouteSettings).sub ? "" : "active"}
            onclick={() => changePath({ main: "settings" })}>General</a
          >
          <a
            class={($path as RouteSettings).sub ? "active" : ""}
            onclick={() => changePath({ main: "settings", sub: "devices" })}
            >Devices</a
          >
        </div>
        <div class="page {($path as RouteSettings).sub ? '' : 'active'}">
          <table id="general" class="border secondary-container">
            <colgroup>
              <col span="1" style="width: 20%;" />
              <col span="1" style="width: 80%;" />
            </colgroup>

            <tbody>
              <tr>
                <td class="bold">User:</td>
                <td>
                  <div class="table-box">
                    <div class="row">
                      <p class="bold">Username:</p>
                      <div class="field border small">
                        <input
                          bind:value={$userParams.display_name}
                          onfocus={() =>
                            ($userParams.display_name = $user.display_name)}
                          onblur={() =>
                            $userParams.display_name != $user.display_name &&
                            apiClient("ws").sendMessage({
                              type: "updateUser",
                              data: {
                                display_name: $userParams.display_name,
                              },
                            })}
                        />
                      </div>
                    </div>
                    <!-- svelte-ignore a11y_missing_attribute, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                    <div class="row">
                      <p class="bold">Avatar:</p>
                      <div class="center-align">
                        <img
                          id="avatar-image"
                          src={getDicebearUrl(
                            $userParams.avatar_seed != ""
                              ? $userParams.avatar_seed
                              : $user.avatar_seed,
                          )}
                          width="50"
                          alt="Avatar"
                          draggable="false"
                        />
                      </div>
                      <a
                        class="chip primary round"
                        onclick={() => ($userParams.avatar_seed = nanoid(8))}
                        >Change</a
                      >
                      {#if $userParams.avatar_seed != "" && $userParams.avatar_seed != $user.avatar_seed}
                        <a
                          class="chip primary round"
                          onclick={() =>
                            apiClient("ws").sendMessage({
                              type: "updateUser",
                              data: {
                                avatar_seed: $userParams.avatar_seed,
                              },
                            })}>Save</a
                        >
                      {/if}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="bold">Account:</td>
                <td>
                  <div class="row">
                    <!-- svelte-ignore a11y_missing_attribute, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                    <a
                      class="chip primary round"
                      onclick={() => apiClient("http").deleteAccount(false)}
                      >Delete Account</a
                    >
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="page {($path as RouteSettings).sub ? 'active' : ''}">
          <table class="border secondary-container">
            <colgroup>
              <col />
              <col />
              <col />
              <col style="width: 60px;" />
            </colgroup>

            <thead>
              <tr>
                <th>Device name</th>
                <th>Type</th>
                <th>Created at</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {#if $devices !== undefined}
                <tr>
                  <td
                    ><div class="field border small">
                      <input
                        bind:value={$deviceParams[$devices.self.did]
                          .display_name}
                        onfocus={() =>
                          ($deviceParams[$devices.self.did].display_name =
                            $devices.self.display_name)}
                        onblur={() => blur($devices.self, "name")}
                      />
                    </div></td
                  >
                  <td
                    ><div class="field border small suffix">
                      <select
                        bind:value={$deviceParams[$devices.self.did].type}
                        onfocus={() =>
                          ($deviceParams[$devices.self.did].type =
                            $devices.self.type)}
                        onblur={() => blur($devices.self, "type")}
                        style="min-width: 200px;"
                      >
                        {#each Object.entries(DeviceType) as [label, value]}
                          <option {value}>{label}</option>
                        {/each}
                      </select>
                      <i>arrow_drop_down</i>
                    </div></td
                  >
                  <td
                    >{dayjs
                      .unix($devices.self.created_at)
                      .format("HH:mm, DD.MM.YYYY")}</td
                  >
                  <td
                    ><button
                      class="transparent circle"
                      onclick={() => apiClient("http").deleteAccount(true)}
                    >
                      <i>delete</i>
                    </button></td
                  >
                </tr>
                {#each $devices.others as device}
                  <tr>
                    <td
                      ><div class="field border small">
                        <input
                          bind:value={$deviceParams[device.did].display_name}
                          onfocus={() =>
                            ($deviceParams[device.did].display_name =
                              device.display_name)}
                          onblur={() => blur(device, "name")}
                        />
                      </div></td
                    >
                    <td
                      ><div class="field border small suffix">
                        <select
                          bind:value={$deviceParams[device.did].type}
                          onfocus={() =>
                            ($deviceParams[device.did].type = device.type)}
                          onblur={() => blur(device, "type")}
                          style="min-width: 200px;"
                        >
                          {#each Object.entries(DeviceType) as [label, value]}
                            <option {value}>{label}</option>
                          {/each}
                        </select>
                        <i>arrow_drop_down</i>
                      </div></td
                    >
                    <td
                      >{dayjs
                        .unix(device.created_at)
                        .format("HH:mm, DD.MM.YYYY")}</td
                    >
                    <td
                      ><button
                        class="transparent circle"
                        onclick={() =>
                          apiClient("ws").sendMessage({
                            type: "deleteDevice",
                            data: device.did,
                          })}
                      >
                        <i>delete</i>
                      </button></td
                    >
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  </div>
{:else}
  <p id="header" class="bold">User</p>

  <Button
    onclick={async () =>
      apiClient("ws").sendMessage({
        type: "updateUser",
        data: {
          display_name: await openEditDialog(
            { title: "Username", placeholder: "Username", type: "string" },
            $user.display_name,
          ),
        },
      })}
  >
    <div>
      <p id="title">Username</p>
      <p id="subtitle">
        {$user.display_name}
      </p>
    </div>
  </Button>

  <Button
    onclick={async () =>
      apiClient("ws").sendMessage({
        type: "updateUser",
        data: {
          avatar_seed: await openEditDialog(
            { title: "Avatar", type: "avatar" },
            $user.avatar_seed,
          ),
        },
      })}
  >
    <div>
      <p id="title">Avatar</p>
      <p id="subtitle">Choose your Avatar</p>
    </div>
    <span class="max"></span>
    <img
      class="responsive"
      style="height: 50px; width: 50px; margin-right: 5px;"
      src={getDicebearUrl($user.avatar_seed)}
      alt="Avatar"
      draggable="false"
    />
  </Button>

  <p id="header" class="bold">Devices</p>

  <Button
    onclick={() => {
      changePath({ main: "settings", sub: "devices" });
    }}
  >
    <div>
      <p id="title">Devices</p>
      <p id="subtitle">Manage devices</p>
    </div>
  </Button>

  <p id="header" class="bold">Account</p>

  <!-- svelte-ignore a11y_missing_attribute a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <Button onclick={() => apiClient("http").deleteAccount(false)}>
    <div style="color: red;">
      <p id="title">Delete account</p>
      <p id="subtitle">Removes user and all devices from database</p>
    </div>
  </Button>
{/if}

<style>
  #general {
    & td {
      vertical-align: top;
      padding: 20px 8px;
    }
  }

  .table-box {
    display: flex;
    flex-flow: column;
  }

  #header {
    margin: 20px 0 5px 0;
    padding: 0 20px;
    color: var(--secondary);
  }
</style>
