<script>
  import SidebarToggleStore from "$lib/stores/SidebarToggleStore.js";
  import { onDestroy } from "svelte";

  let visible = true;
  const unsubscribe = SidebarToggleStore.subscribe((value) => {
    visible = value;
  });

  onDestroy(unsubscribe);
</script>

<div class={visible ? "" : "middle"}>
  <ul>
    <li><a href="/contacts">+ Gerät hinzufügen</a></li>
    <li><a href="/contacts">+ Kontakt hinzufügen</a></li>
  </ul>
</div>

<style>
  div {
    position: absolute;
    height: 100vh;
    z-index: -51;
    transition-duration: 0.5s;
    background-color: gray;
  }
  .middle {
    left: 0px;
  }
  ul {
    width: 200px;
    margin-top: 50%;
    height: 100%;
    list-style-type: none;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: center;
    border-right: 1px solid black;
    justify-content: flex-start;
  }

  li {
    padding: 10% 5% 10% 10%;
    border: 3px solid black;
    border-radius: 5px;
    margin-top: 20px;
    margin-left: 10%;
    margin-right: 10%;
    transition-duration: 0.7s;
  }

  li:hover > a {
    color: white;
  }

  li:hover {
    background-color: black;
    border-color: white;
  }

  li a {
    text-decoration: none;
    font-size: large;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-weight: bold;
    color: black;
    font-size: 20px;
    transition-duration: 0.7s;
  }

  @media screen and (max-width: 500px) {
    div {
      left: -200px;
    }
  }
</style>
