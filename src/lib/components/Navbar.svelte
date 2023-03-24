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
    console.log(visible);
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
    margin-top: 10px;
    margin-left: 20px;
  }

  nav {
    z-index: -50;
    width: 100vw;
    height: 10%;
    position: absolute;
    top: 0;
    right: 0;
    background-color: #0193cb;
  }

  .hamburger {
    position: absolute;
    left: 20px;
    top: 30px;
    width: 30px;
    height: 4px;
    background: #fff;
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
    background-color: #fff;
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
    left: 16px;
    top: 14px;
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
    grid-column: 5;
    height: 10px;
    cursor: pointer;
    width: 10px;
    border-radius: 50%;
    border: 1px solid black;
    position: absolute;
    top: 30px;
    left: 40%;
  }

  .status::before {
    content: "Online";
    width: 150px;
    height: 20px;
    line-height: 20px;
    position: absolute;
    text-align: center;
    background-color: rgba(200, 200, 200, 0.7);
    padding: 2px;
    border-radius: 5px;
    top: 20px;
    left: 5px;
    opacity: 0%;
    cursor: default;
    transition: 0.3s opacity;
    pointer-events: none;
  }

  .status:hover::before {
    opacity: 100%;
  }

  .fa {
    font-size: 300%;
    cursor: pointer;
    transition: color 0.7s;
  }

  .fa-user-circle-o {
    margin-right: 10px;
  }

  .fa:hover {
    color: white;
  }

  @media screen and (max-width: 500px) {
    .hamburger,
    .toggle-menu {
      display: inline;
    }
  }
</style>
