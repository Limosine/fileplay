<script lang="ts">
  import { nanoid } from "nanoid";

  import { DeviceType, getDicebearUrl } from "$lib/lib/common";
  import type { DialogEdit } from "$lib/lib/UI";

  export let properties: DialogEdit;
</script>

<p style="font-size: large; margin-bottom: 2px;">
  {properties.title}
</p>

<div class="field">
  <!-- svelte-ignore a11y-autofocus -->
  {#if properties.type == "string"}
    <input
      bind:value={properties.value}
      placeholder={properties.placeholder}
      maxlength={properties.length}
    />
  {:else if properties.type == "avatar"}
    <div class="center-align">
      <img
        id="avatar-image"
        src={getDicebearUrl(properties.value)}
        width="100"
        alt="Avatar"
        draggable="false"
      />
    </div>
    <nav class="right-align" style="padding: 10px 0 0 0;">
      <button
        class="transparent link"
        on:click={() => (properties.value = nanoid(8))}>Change Avatar</button
      >
    </nav>
  {:else}
    <nav style="display: grid; padding: 0;">
      {#each Object.entries(DeviceType) as [label, value]}
        <label class="radio">
          <input
            checked={properties.value == value}
            on:change={(event) =>
              (properties.value = event.currentTarget.value)}
            type="radio"
            name="deviceType"
            {value}
          />
          <span style="padding-left: 20px;">{label}</span>
        </label>
      {/each}
    </nav>
  {/if}
</div>
