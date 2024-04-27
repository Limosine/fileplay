<script lang="ts">
  export let clickable = true;
</script>

{#if clickable}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <a id="common" class="chip border responsive row" on:click>
    <slot />
  </a>
{:else}
  <div id="common" class="notClickable row">
    <slot />
  </div>
{/if}

<style>
  #common {
    margin: 0;
    padding: 35px 20px;
    border: 0;
    color: var(--on-background);
  }

  #common.notClickable {
    height: 70px;
    padding: 0 20px;
  }

  #common.notClickable {
    & :global(#title) {
      margin-bottom: -3px;
    }
  }

  #common {
    & :global(#title) {
      font-size: large;
      margin-bottom: 0;
    }

    & :global(#subtitle) {
      font-size: small;
      margin-top: 0;
    }
  }
</style>
