<script>
  import SidebarToggleStore from "$lib/stores/SidebarToggleStore.js";
  import { onDestroy } from "svelte";
  import { goto } from "$app/navigation";

  let visible = true;
  const unsubscribe = SidebarToggleStore.subscribe((value) => {
    visible = value;
  });

  onDestroy(unsubscribe);

  const addContact = () => {
    goto("/contacts/add");
  };

  const addDevice = () => {
    goto("/devices/add");
  };
</script>

<div class={visible ? "" : "middle"}>
  <ul>
    <li>
      <button on:click={addDevice}>+Gerät hinzufügen</button>
    </li>
    <li><button on:click={addContact}>+ Kontakt hinzufügen</button></li>
  </ul>
</div>

<style>
  div {
    height: 100%;
    width: 200px;
    z-index: -51;
    transition-duration: 0.5s;
    background-color: gray;
  }
  .middle {
    margin-left: 0px;
  }
  ul {
    width: 200px;
    height: 100%;
    list-style-type: none;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: center;
    border-right: 1px solid black;
    justify-content: flex-start;
  }

  button {
    padding: 10% 10% 10% 10%;
    border: 3px solid white;
    background-color: rgb(55, 55, 55);
    border-radius: 5px;
    margin-top: 20px;
    margin-left: 10%;
    margin-right: 10%;
    transition-duration: 0.7s;
    text-decoration: none;
    font-size: large;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-weight: bold;
    color: white;
    font-size: 20px;
    text-align: center;
  }

  button:hover {
    background-color: white;
    border-color: black;
    color: black;
    cursor: pointer;
  }

  @media screen and (max-width: 500px) {
    div {
      margin-left: -200px;
    }
  }
</style>
