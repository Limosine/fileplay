<script lang="ts">
  import ui from "beercss";
  import dayjs from "dayjs";
  import { nanoid } from "nanoid";

  import { apiClient } from "$lib/api/client";
  import { DeviceType, getDicebearUrl } from "../../../../common/common";
  import { type IDevices } from "$lib/lib/fetchers";
  import { ui_object, type RouteSettings } from "$lib/lib/UI.svelte";

  import Button from "$lib/components/Button.svelte";

  const blur = (device: IDevices["self"], mode: "type" | "name") => {
    if (
      (mode == "name" &&
        ui_object.deviceParams[device.did].display_name !=
          device.display_name) ||
      (mode == "type" && ui_object.deviceParams[device.did].type != device.type)
    )
      apiClient("ws").sendMessage({
        type: "updateDevice",
        data: {
          update:
            mode == "name"
              ? {
                  display_name: ui_object.deviceParams[device.did].display_name,
                }
              : {
                  type: ui_object.deviceParams[device.did].type as DeviceType,
                },
          did: device.did,
        },
      });
  };

  $effect(() => {
    // Open dialog
    if (
      ui_object.layout == "mobile" &&
      (ui_object.path as RouteSettings).sub &&
      ui_object.largeDialog &&
      !ui_object.largeDialog.open
    )
      ui("#dialog-large");

    // Close dialogs
    if (
      (ui_object.layout == "desktop" ||
        !(ui_object.path as RouteSettings).sub) &&
      ui_object.largeDialog &&
      ui_object.largeDialog.open
    )
      ui("#dialog-large");
    if (
      ui_object.layout == "desktop" &&
      ui_object.dialogProperties.mode == "edit" &&
      ui_object.generalDialog?.open
    )
      ui_object.closeDialog();
  });
</script>

{#if ui_object.layout == "desktop"}
  <div style="padding: 20px;">
    <article style="padding: 15px 12px;" class="secondary-container">
      <div class="row">
        <h6>Settings</h6>
        <div class="max"></div>
        {#if "sub" in ui_object.path && ui_object.path.sub == "devices"}
          <!-- svelte-ignore a11y_missing_attribute, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <a
            class="chip primary round"
            onclick={() =>
              ui_object.openDialog({ mode: "add", addMode: "device" })}
            >Link device</a
          >
        {/if}
      </div>
      <div>
        <!-- svelte-ignore a11y_missing_attribute, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="tabs">
          <a
            class={(ui_object.path as RouteSettings).sub ? "" : "active"}
            onclick={() => ui_object.changePath({ main: "settings" })}
            >General</a
          >
          <a
            class={(ui_object.path as RouteSettings).sub ? "active" : ""}
            onclick={() =>
              ui_object.changePath({ main: "settings", sub: "devices" })}
            >Devices</a
          >
        </div>
        <div
          class="page {(ui_object.path as RouteSettings).sub ? '' : 'active'}"
        >
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
                          bind:value={ui_object.userParams.display_name}
                          onfocus={() =>
                            ui_object.user !== undefined &&
                            (ui_object.userParams.display_name =
                              ui_object.user.display_name)}
                          onblur={() =>
                            ui_object.user !== undefined &&
                            ui_object.userParams.display_name !=
                              ui_object.user.display_name &&
                            apiClient("ws").sendMessage({
                              type: "updateUser",
                              data: {
                                display_name: ui_object.userParams.display_name,
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
                          src={ui_object.user !== undefined
                            ? getDicebearUrl(
                                ui_object.userParams.avatar_seed != ""
                                  ? ui_object.userParams.avatar_seed
                                  : ui_object.user.avatar_seed,
                              )
                            : undefined}
                          width="50"
                          alt="Avatar"
                          draggable="false"
                        />
                      </div>
                      <a
                        class="chip primary round"
                        onclick={() =>
                          (ui_object.userParams.avatar_seed = nanoid(8))}
                        >Change</a
                      >
                      {#if ui_object.userParams.avatar_seed != "" && ui_object.user !== undefined && ui_object.userParams.avatar_seed != ui_object.user.avatar_seed}
                        <a
                          class="chip primary round"
                          onclick={() =>
                            apiClient("ws").sendMessage({
                              type: "updateUser",
                              data: {
                                avatar_seed: ui_object.userParams.avatar_seed,
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
        <div
          class="page {(ui_object.path as RouteSettings).sub ? 'active' : ''}"
        >
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
              {#if ui_object.devices !== undefined}
                <tr>
                  <td
                    ><div class="field border small">
                      <input
                        bind:value={
                          ui_object.deviceParams[ui_object.devices.self.did]
                            .display_name
                        }
                        onfocus={() =>
                          ui_object.devices !== undefined &&
                          (ui_object.deviceParams[
                            ui_object.devices.self.did
                          ].display_name = ui_object.devices.self.display_name)}
                        onblur={() =>
                          ui_object.devices !== undefined &&
                          blur(ui_object.devices.self, "name")}
                      />
                    </div></td
                  >
                  <td
                    ><div class="field border small suffix">
                      <select
                        bind:value={
                          ui_object.deviceParams[ui_object.devices.self.did]
                            .type
                        }
                        onfocus={() =>
                          ui_object.devices !== undefined &&
                          (ui_object.deviceParams[
                            ui_object.devices.self.did
                          ].type = ui_object.devices.self.type)}
                        onblur={() =>
                          ui_object.devices !== undefined &&
                          blur(ui_object.devices.self, "type")}
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
                      .unix(ui_object.devices.self.created_at)
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
                {#each ui_object.devices.others as device}
                  <tr>
                    <td
                      ><div class="field border small">
                        <input
                          bind:value={
                            ui_object.deviceParams[device.did].display_name
                          }
                          onfocus={() =>
                            (ui_object.deviceParams[device.did].display_name =
                              device.display_name)}
                          onblur={() => blur(device, "name")}
                        />
                      </div></td
                    >
                    <td
                      ><div class="field border small suffix">
                        <select
                          bind:value={ui_object.deviceParams[device.did].type}
                          onfocus={() =>
                            (ui_object.deviceParams[device.did].type =
                              device.type)}
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
      ui_object.user !== undefined &&
      apiClient("ws").sendMessage({
        type: "updateUser",
        data: {
          display_name: await ui_object.openEditDialog(
            { title: "Username", placeholder: "Username", type: "string" },
            ui_object.user.display_name,
          ),
        },
      })}
  >
    <div>
      <p id="title">Username</p>
      <p id="subtitle">
        {ui_object.user?.display_name}
      </p>
    </div>
  </Button>

  <Button
    onclick={async () =>
      ui_object.user !== undefined &&
      apiClient("ws").sendMessage({
        type: "updateUser",
        data: {
          avatar_seed: await ui_object.openEditDialog(
            { title: "Avatar", type: "avatar" },
            ui_object.user.avatar_seed,
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
      src={ui_object.user !== undefined
        ? getDicebearUrl(ui_object.user.avatar_seed)
        : undefined}
      alt="Avatar"
      draggable="false"
    />
  </Button>

  <p id="header" class="bold">Devices</p>

  <Button
    onclick={() => {
      ui_object.changePath({ main: "settings", sub: "devices" });
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
