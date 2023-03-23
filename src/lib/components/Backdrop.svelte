<script>
    
  import { goto } from "$app/navigation";

    function goHome() {
        console.log("Hi");
        goto('/');
    }

</script>

<div class="backdrop" on:click={goHome}>

</div>

<style>
    .backdrop {
        position: absolute;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: -10;
        background-color: rgba(0, 0, 0, 0.5);
    }
</style>