<script>
  import Navbar from "$lib/components/Navbar.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import Footer from "$lib//components/Footer.svelte";
</script>

<Navbar />
<div class="app-container">
  <slot />
</div>

<Sidebar />
<Footer />

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>
