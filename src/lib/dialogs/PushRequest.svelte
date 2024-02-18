<script lang="ts">
  import { subscribeWebPush } from "$lib/lib/fetchers";
  import { registration, requestDialog, subscribedToPush } from "$lib/lib/UI";
</script>

<dialog id="dialog-request" bind:this={$requestDialog}>
  <p style="font-size: large; margin-bottom: 10px;">Add contact</p>
  <div>Do you want to enable Notifications?</div>
  <nav class="right-align" style="padding: 10px 0 0 0;">
    <!-- eslint-disable no-undef -->
    <!-- svelte-ignore missing-declaration -->
    <button
      class="border"
      style="border: 0;"
      on:click={() => {
        $subscribedToPush = false;
        ui("#dialog-request");
      }}>Deny</button
    >
    <!-- svelte-ignore missing-declaration -->
    <button
      class="border"
      style="border: 0;"
      on:click={async () => {
        await subscribeWebPush($registration);
        ui("#dialog-request");
      }}>Allow</button
    >
    <!-- eslint-enable no-undef -->
  </nav>
</dialog>
