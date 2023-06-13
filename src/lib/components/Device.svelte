<script lang="ts">
  import Textfield from "@smui/textfield";

  import {
    deviceParams,
    setupLoading,
    original_displayName,
    original_type,
    deviceID,
    device_edit_loaded,

    editDevice_open

  } from "$lib/stores/Dialogs";
  import { devices_loaded, devices } from "$lib/personal";
  import Select, { Option } from "@smui/select";
  import { DeviceType } from "$lib/common";
  import Radio from '@smui/radio';
  import FormField from '@smui/form-field';

  function withDeviceType(name: string): { type: string; name: string } {
    // @ts-ignore
    return { name, type: DeviceType[name] as string };
  }

  const loadInfos = (devices: { self: {
    did: number;
    type: string;
    displayName: string;
    createdAt: number;
    lastSeenAt: number;
  };
  others: {
    did: number;
    type: string;
    displayName: string;
    createdAt: number;
    lastSeenAt: number;
  }[]; }, did: number) => {
    let device: {did: number; type: string; displayName: string; createdAt: number; lastSeenAt: number } | undefined;

    if (devices.self.did == did) {
      device = devices.self;
    } else {
      device = devices.others.find(device => device.did === did);
    }

    if (!device) throw new Error("No device with this deviceID is linked to this account.");

    $deviceParams.displayName = device.displayName;
    $deviceParams.type = device.type;
    $original_displayName = device.displayName;
    $original_type = device.type;

    $device_edit_loaded = true;
  };
</script>

<div style="display: none">
  {#if $devices_loaded && $deviceID && !$device_edit_loaded}
    {#await $devices then devices}
      {loadInfos(devices, $deviceID)}
    {/await}
  {/if}
</div>

{#if !$editDevice_open}
<div id="content">
  <Textfield
    bind:value={$deviceParams.displayName}
    label="Device Name"
    bind:disabled={$setupLoading}
    input$maxlength={32}
  />
  <Select
    bind:value={$deviceParams.type}
    label="Device Type"
    bind:disabled={$setupLoading}
  >
    {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
      <Option value={type}>{name}</Option>
    {/each}
  </Select>
</div>
{:else}
<div id="content-column">
  <Textfield
    bind:value={$deviceParams.displayName}
    label="Device Name"
    bind:disabled={$setupLoading}
    input$maxlength={32}
  />
  <h6>Device Type</h6>
  {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
    <FormField>
      <Radio
        bind:group={$deviceParams.type}
        bind:value={type}
        bind:disabled={$setupLoading}
      />
      <span slot="label">
        {name}
      </span>
    </FormField>
  {/each}
</div>
{/if}


<style>
  #content {
    display: flex;
    flex-flow: row;
    gap: 7px;
  }

  #content-column {
    display: flex;
    flex-flow: column;
    gap: 7px;
  }
</style>