<script lang="ts">
  import dayjs from "dayjs";

  import { apiClient } from "$lib/api/client";
  import { DeviceType, getDicebearUrl } from "$lib/lib/common";
  import {
    changePath,
    deviceParams,
    devices,
    layout,
    openDialog,
    path,
    user,
    userParams,
  } from "$lib/lib/UI";
  import { nanoid } from "nanoid";
  import { withDeviceType, type IDevices } from "$lib/lib/fetchers";

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
</script>

{#if $user !== undefined}
  {#if $layout == "desktop"}
    <div style="padding: 20px;">
      <article style="padding: 15px 12px;" class="secondary-container">
        <h6>Settings</h6>
        <div>
          <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
          <div class="tabs">
            <a
              class={"sub" in $path ? "" : "active"}
              on:click={() => changePath({ main: "settings" })}>General</a
            >
            <a
              class={"sub" in $path ? "active" : ""}
              on:click={() => changePath({ main: "settings", sub: "devices" })}
              >Devices</a
            >
          </div>
          <div class="page {'sub' in $path ? '' : 'active'}">
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
                            on:focus={() =>
                              ($userParams.display_name = $user.display_name)}
                            on:blur={() =>
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
                      <!-- svelte-ignore a11y-missing-attribute a11y-no-static-element-interactions a11y-click-events-have-key-events -->
                      <div class="row">
                        <p class="bold">Avatar:</p>
                        <div class="center-align">
                          <img
                            id="avatar-image"
                            src={getDicebearUrl(
                              $userParams.avatar_seed != ""
                                ? $userParams.avatar_seed
                                : $user.avatar_seed,
                              50,
                            )}
                            width="50"
                            alt="Avatar"
                          />
                        </div>
                        <a
                          class="chip primary round"
                          on:click={() => ($userParams.avatar_seed = nanoid(8))}
                          >Change</a
                        >
                        {#if $userParams.avatar_seed != "" && $userParams.avatar_seed != $user.avatar_seed}
                          <a
                            class="chip primary round"
                            on:click={() =>
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
                      <!-- svelte-ignore a11y-missing-attribute a11y-no-static-element-interactions a11y-click-events-have-key-events -->
                      <a
                        class="chip primary round"
                        on:click={() => apiClient("http").deleteAccount(false)}
                        >Delete Account</a
                      >
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="page {'sub' in $path ? 'active' : ''}">
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
                  <th />
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
                          on:focus={() =>
                            ($deviceParams[$devices.self.did].display_name =
                              $devices.self.display_name)}
                          on:blur={() => blur($devices.self, "name")}
                        />
                      </div></td
                    >
                    <td
                      ><div class="field border small suffix">
                        <select
                          bind:value={$deviceParams[$devices.self.did].type}
                          on:focus={() =>
                            ($deviceParams[$devices.self.did].type =
                              $devices.self.type)}
                          on:blur={() => blur($devices.self, "type")}
                          style="min-width: 200px;"
                        >
                          {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
                            <option value={type}>{name}</option>
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
                        on:click={() =>
                          apiClient("http").deleteAccount(true)}
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
                            on:focus={() =>
                              ($deviceParams[device.did].display_name =
                                device.display_name)}
                            on:blur={() => blur(device, "name")}
                          />
                        </div></td
                      >
                      <td
                        ><div class="field border small suffix">
                          <select
                            bind:value={$deviceParams[device.did].type}
                            on:focus={() =>
                              ($deviceParams[device.did].type = device.type)}
                            on:blur={() => blur(device, "type")}
                            style="min-width: 200px;"
                          >
                            {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
                              <option value={type}>{name}</option>
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
                          on:click={() =>
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
  {:else if !("sub" in $path)}
    <p
      class="bold"
      style="color: var(--secondary); margin: 20px 0px 5px 0px; padding: 0px 20px 0px 20px;"
    >
      User
    </p>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => openDialog("username")}
    >
      <div class="column">
        <p style="font-size: large; margin-bottom: 2px;">Username</p>
        <p style="font-size: small; margin-top: 0;">
          {$user.display_name}
        </p>
      </div>
    </a>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => openDialog("avatar")}
    >
      <div class="column">
        <p style="font-size: large; margin-bottom: 2px;">Avatar</p>
        <p style="font-size: small; margin-top: 0;">Choose your Avatar</p>
      </div>
      <span class="max" />
      <img
        class="responsive"
        style="height: 50px; width: 50px; margin-right: 5px;"
        src={getDicebearUrl($user.avatar_seed, 150)}
        alt="Avatar"
      />
    </a>

    <p
      class="bold"
      style="color: var(--secondary); margin: 20px 0px 5px 0px; padding: 0px 20px 0px 20px;"
    >
      Devices
    </p>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => changePath({ main: "settings", sub: "devices" })}
    >
      <div class="column">
        <p style="font-size: large; margin-bottom: 2px;">Devices</p>
        <p style="font-size: small; margin-top: 0;">Manage devices</p>
      </div>
    </a>

    <p
      class="bold"
      style="color: var(--secondary); margin: 20px 0px 5px 0px; padding: 0px 20px 0px 20px;"
    >
      Account
    </p>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => apiClient("http").deleteAccount(false)}
    >
      <div class="column" style="color: red;">
        <p style="font-size: large; margin-bottom: 2px;">Delete account</p>
        <p style="font-size: small; margin-top: 0;">
          Removes user and all devices from database
        </p>
      </div>
    </a>
  {:else}
    <button
      on:click={() => changePath({ main: "settings" })}
      class="transparent circle"
      style="margin: 8px;"
    >
      <i>arrow_back</i>
    </button>
    <h3 style="margin-bottom: 30px; padding: 0px 20px 0px 20px;">Devices</h3>

    {#if $devices !== undefined}
      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openDialog("deviceName", $devices.self.did)}
      >
        <div class="column">
          <p style="font-size: large; margin-bottom: 2px;">
            {$devices.self.display_name}
          </p>
          <p style="font-size: small; margin-top: 0;">This device.</p>
        </div>
      </a>
      {#each $devices.others as device}
        <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <a
          class="chip border responsive row"
          style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
          on:click={() => openDialog("deviceName", device.did)}
        >
          <div class="column">
            <p style="font-size: large; margin-bottom: 2px;">
              {device.display_name}
            </p>
            <p style="font-size: small; margin-top: 0;">
              Created at {dayjs
                .unix(device.created_at)
                .format("HH:mm, DD.MM.YYYY")}.
            </p>
          </div>
        </a>
      {/each}
    {/if}
  {/if}
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
</style>
