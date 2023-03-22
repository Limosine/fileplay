<script lang="js">
  // @ts-nocheck
  import { goto } from "$app/navigation";
  import { construct_svelte_component } from "svelte/internal";
  import Checkbox from "./Checkbox.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let title = "Title";

  function makeid(length) {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  let contacts = [
    { name: makeid(5) },
    { name: makeid(5) },
    { name: makeid(5) },
    { name: makeid(5) },
    { name: makeid(5) },
    { name: makeid(5) },
    { name: makeid(5) },
    { name: makeid(5) },
    { name: makeid(5) },
    { name: makeid(5) },
  ];

  let selected = [];

  const toggleStatus = (name) => {
    console.log(selected);
    if (selected.find((n) => n == name)) {
      selected = selected.filter((n) => n != name);
    } else {
      selected = [...selected, name];
      console.log(name);
    }
  };

  const toHomePage = (c) => {
    console.log(c);
    if (c == "backdrop") {
      goto("/testIndex");
    }
  };

  let sizePerItem = 1;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="backdrop"
  on:click|self={() => {
    toHomePage("backdrop");
  }}
>
  <div class="box">
    <h1>{title}</h1>
    <div class="flex">
      {#if !(selected === undefined || selected.length == 0)}
        {#each selected as s}
          <div class="flexitem" on:click={toggleStatus(s)}>{s}</div>
        {/each}
      {/if}
    </div>
    <div class="line" />
    <form method="post">
      {#each contacts as contact}
        <!-- <Checkbox id={contact.name}></Checkbox> -->
        <!-- <label> <input type="checkbox" value={contact.name} /></label> -->
        <Checkbox
          id={contact.name}
          on:click={() => toggleStatus(contact.name)}
          checked={selected.find((n) => n == contact.name)}
        />
      {/each}
      <input class="submit" type="submit" value="Senden" />
    </form>
  </div>
</div>

<style>
  h1 {
    padding: 20px;
    font-size: 3vh;
    font-weight: bold;
  }
  .line {
    height: 1px;
    border-top: 1px solid black;
    margin: 0px;
    padding: 0px;
  }
  .backdrop {
    width: 100%;
    height: 100%;
    position: fixed;
    background: rgba(0, 0, 0, 0.5);
  }
  .box {
    padding: 10px 10px 40px 10px;
    border-radius: 10px;
    width: 50%;
    margin: 10% auto 10% auto;
    text-align: center;
    background: white;
    display: grid;
  }
  form {
    padding: 20px 10px 10px 0px;
    display: grid;
    overflow-y: auto;
    height: 20vh;
    width: 100%;
    margin-top: 10px;
    margin-bottom: 10px;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    grid-template-rows: repeat(auto-fit, minmax(100px, 1fr));
    gap: 10px;
    justify-items: center;
    align-items: center;
  }
  .flex {
    display: inline-flex;
    flex-direction: row;
    justify-content: flex-start;
    flex-wrap: wrap;
    overflow-y: scroll;
    align-items: center;
    align-content: flex-start;
    width: 100%;
    height: 10vh;
  }
  .flexitem {
    width: 20%;
    text-align: center;
    margin: 1vh;
    padding: 1vh;
    border-radius: 5px;
    border: 1px solid black;
    background-color: rgba(240, 240, 240, 200);
    display: flex;
    flex-direction: column;
    align-content: center;
    align-items: center;
    cursor: pointer;
  }

  .flexitem:hover {
    background-color: white;
  }

  .submit {
    position: absolute;
    border-radius: 5px;
    border: 3px solid black;
    background-color: white;
    cursor: pointer;
    font-weight: bold;
    font-size: 15px;
    padding: 5px;
    bottom: 29.5%;
  }

  .submit:hover {
    background-color: #478bfb;
    color: white;
    transition-duration: 0.1s;
    transform: scale(1.2);
  }
</style>
