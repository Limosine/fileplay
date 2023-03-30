<script>
  import Modal from "$lib/components/Modal.svelte";
  import Backdrop from "$lib/components/Backdrop.svelte";

  export let contacts;
</script>


<div>
  <Modal title="Contacts" />
  <Backdrop />
</div>


<style>
  div {
    position: absolute; 
    width: 100%;
    height: 100%;
    z-index: 1000;
  }
</style>
