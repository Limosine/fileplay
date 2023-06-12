<script lang="ts">
  import Textfield from "@smui/textfield";

  import {
    deviceParams,
    setupLoading,
    original_displayName,
    original_type,
    deviceID,
    device_edit_loaded
  } from "$lib/stores/Dialogs";
  import { devices_loaded, devices } from "$lib/personal";
  import Select, { Option } from "@smui/select";
  import { DeviceType } from "$lib/common";

  function withDeviceType(name: string): { type: string; name: string } {
    // @ts-ignore
    return { name, type: DeviceType[name] as string };
  }

  const loadInfos = (devices: {
    did: number;
    type: string;
    displayName: string;
    createdAt: number;
    lastSeenAt: number;
  }[], did: number) => {
    const device = devices.find(device => device.did === did);
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

<Textfield
  bind:value={$deviceParams.displayName}
  label="Device Name"
  bind:disabled={$setupLoading}
  input$maxlength={32}
/>
<Select
  bind:value={$deviceParams .type}
  label="Device Type"
  bind:disabled={$setupLoading}
>
  {#each Object.keys(DeviceType).map(withDeviceType) as { type, name }}
    <Option value={type}>{name}</Option>
  {/each}
</Select>