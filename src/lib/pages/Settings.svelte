<script lang="ts">
  import dayjs from "dayjs";

  import { getDicebearUrl } from "$lib/lib/common";
  import { deleteAccount } from "$lib/lib/fetchers";
  import { devices, did, openDialog, settings_page, user } from "$lib/lib/UI";
</script>

{#if $settings_page == "main"}
  {#await $user}
    <p>User infos are loading...</p>
  {:then user}
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
      on:click={() => openDialog("username", "Username", user.display_name)}
    >
      <div class="column">
        <p style="font-size: large; margin-bottom: 2px;">Username</p>
        <p style="font-size: small; margin-top: 0;">
          {user.display_name}
        </p>
      </div>
    </a>

    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <a
      class="chip border responsive row"
      style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
      on:click={() => openDialog("avatar", "Avatar", user.avatar_seed)}
    >
      <div class="column">
        <p style="font-size: large; margin-bottom: 2px;">Avatar</p>
        <p style="font-size: small; margin-top: 0;">Choose your Avatar</p>
      </div>
      <span class="max" />
      <img
        class="responsive"
        style="height: auto;"
        src={getDicebearUrl(user.avatar_seed, 150)}
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
      on:click={() => ($settings_page = "devices")}
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
      on:click={() => deleteAccount()}
    >
      <div class="column" style="color: red;">
        <p style="font-size: large; margin-bottom: 2px;">Delete account</p>
        <p style="font-size: small; margin-top: 0;">
          Removes user and all devices from database
        </p>
      </div>
    </a>
  {:catch}
    <p>Failed to load user infos.</p>
  {/await}
{:else if $settings_page == "devices"}
  <button
    on:click={() => ($settings_page = "main")}
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
      on:click={() => {
        $did = $devices.self.did;
        openDialog("deviceName", "Device Name", $devices.self.display_name);
      }}
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
        on:click={() => {
          $did = device.did;
          openDialog("deviceName", "Device Name", device.display_name);
        }}
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
