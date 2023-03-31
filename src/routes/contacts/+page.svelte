<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";

  export let data;
</script>

<Modal title="Select Contacts..." contacts={data.contacts}/>
