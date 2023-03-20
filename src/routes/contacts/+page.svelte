<script>
  import Modal from "$lib/components/Modal.svelte";

  export let contacts;
</script>

<div>
  <Modal title="Contacts" />
</div>

<style>
  div {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
  }
</style>
