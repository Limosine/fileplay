<script>
  // @ts-nocheck

  import SidebarToggleStore from "$lib/stores/SidebarToggleStore.js";
  import { onDestroy } from "svelte";

  let visible = true;
  const unsubscribe = SidebarToggleStore.subscribe((value) => {
    visible = value;
  });

  onDestroy(unsubscribe);

  const toggleVisible = () => {
    SidebarToggleStore.update((n) => (n = !n));
  };
</script>

<nav>
  <input type="checkbox" class="toggle-menu" on:click={toggleVisible} />
  <div class="hamburger" />
  <ul>
    <li>
      <div class="status" />
    </li>
    <li>
      <i class="fa fa-cog" aria-hidden="true" />
    </li>
    <li>
      <i class="fa fa-bell" aria-hidden="true" />
    </li>
    <li>
      <i class="fa fa-user-circle-o" aria-hidden="true" />
    </li>
  </ul>
</nav>
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
/>

<style>
  nav ul {
    float: right;
  }

  nav ul li {
    display: inline-block;
    margin-top: 30px;
    margin-left: 20px;
  }

  nav {
    z-index: -49;
    width: 100vw;
    height: 100px;
    background-color: white;
    box-shadow: 0 4px 10px gray;
  }

  .hamburger {
    position: absolute;
    left: 20px;
    top: 50px;
    width: 30px;
    height: 4px;
    background: #000;
    border-radius: 10px;
    cursor: pointer;
    z-index: 2;
    transition: 0.3s;
  }
  .hamburger:before,
  .hamburger:after {
    content: "";
    position: absolute;
    height: 4px;
    left: 0;
    background-color: #000;
    border-radius: 10px;
    transition: 0.3s;
  }

  .hamburger:before {
    top: -10px;
    width: 30px;
  }

  .hamburger:after {
    top: 10px;
    width: 30px;
  }

  .toggle-menu {
    display: inline;
    position: relative;
    left: 17px;
    top: 32px;
    width: 30px;
    height: 30px;
    z-index: 3;
    cursor: pointer;
    opacity: 0;
  }

  input:checked ~ .hamburger {
    background: transparent;
  }

  input:checked ~ .hamburger:before {
    top: 0;
    transform: rotate(45deg);
    width: 30px;
  }

  input:checked ~ .hamburger:after {
    top: 0;
    transform: rotate(-45deg);
    width: 30px;
  }

  .hamburger,
  .toggle-menu {
    display: none;
  }

  .status {
    background-color: lightgreen;
    height: 10px;
    cursor: pointer;
    width: 10px;
    border-radius: 50%;
    border: 1px solid black;
    position: relative;
    right: 20px;
    bottom: 5px;
  }

  .status::before {
    content: "Online";
    width: 150px;
    height: 20px;
    text-align: center;
    background-color: rgba(200, 200, 200, 0.7);
    padding: 5px;
    border-radius: 5px;
    opacity: 0%;
    cursor: default;
    transition: 0.3s opacity;
    pointer-events: none;
  }

  .status:hover::before {
    opacity: 100%;
  }

  .fa {
    font-size: 250%;
    cursor: pointer;
    transition-duration: 0.3s;
  }

  .fa-user-circle-o {
    margin-right: 10px;
  }

  .fa:hover {
    transform: scale(1.2);
  }

  @media screen and (max-width: 500px) {
    .hamburger,
    .toggle-menu {
      display: inline;
    }
  }
</style>
