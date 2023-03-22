<script>
  import Navbar from "$lib/components/Navbar.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import Footer from "$lib//components/Footer.svelte";
</script>

<div>
  <Navbar />
  <Sidebar />
    <div class="app-container">
      <slot />
    </div>
  <!-- </Sidebar> -->
  <Footer />
</div>

<style>
  div {
    z-index: -100;
  }
  .app-container {
    z-index: 100;
    position: absolute;
    top: 50%;
    left: 50%;
  }
</style>
