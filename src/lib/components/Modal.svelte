<script lang="ts">
  import Checkbox from "./Checkbox.svelte";
  import { createEventDispatcher, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { createSearchStore, searchHandler } from "$lib/stores/SearchStore";

  const dispatch = createEventDispatcher();

  export let title = "Title";

  export let contacts: any;

  const searchContacts = contacts.map((contact: any) => ({
    ...contact,
    searchTerms: `${contact.name}`,
  }));

  const searchStore = createSearchStore(searchContacts);

  const unsubscribe = searchStore.subscribe((model) => searchHandler(model));

  onDestroy(() => {
    unsubscribe();
  });

  let selected: string[] = [];

  const toggleStatus = (name: string) => {
    if (selected.find((n) => n == name)) {
      selected = selected.filter((n) => n != name);
    } else {
      selected = [...selected, name];
    }
  };

  let showPlaceHolder: boolean = true;

  const toggleShowPlaceHolder = (event: any) => {
    if (event.target.value == "") showPlaceHolder = !showPlaceHolder;
  };

  const handleKeydown = (event: any) => {
    if (event.keyCode == 27) {
      if (
        document.getElementsByClassName("searchbar").item(0) ==
        document.activeElement
      ) {
        (document.activeElement as HTMLElement).blur();
      } else {
        let box: HTMLElement = document
          .getElementsByClassName("box")
          .item(0) as HTMLElement;
        goto("/");
      }
    }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="box">
  <h1>{title}</h1>
  <input
    class="searchbar"
    type="text"
    placeholder={showPlaceHolder ? "Search..." : ""}
    on:focusin={toggleShowPlaceHolder}
    on:focusout={toggleShowPlaceHolder}
    bind:value={$searchStore.search}
  />
  <div class="line" />
  <form method="post">
    {#each $searchStore.filtered as contact}
      <Checkbox
        id={contact.name}
        on:click={() => toggleStatus(contact.name)}
        checked={selected.includes(contact.name)}
      />
    {/each}
  </form>

  <button
    class="back"
    on:click={() => {
      goto("/");
    }}>Back</button
  >
  <button class="submit">Submit</button>

  <div class="flex">
    {#if !(selected === undefined || selected.length == 0)}
      {#each selected as s}
        <Checkbox
          id={s}
          on:click={() => toggleStatus(s)}
          checked={selected.includes(s)}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  h1 {
    padding: 20px;
    font-size: 3vh;
    font-weight: bold;
    position: absolute;
    left: 0;
    right: 0;
  }

  .searchbar {
    display: inline;
    position: relative;
    top: 110px;
    height: 40px;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-size: 20px;
    border-radius: 5px 5px 0 0;
    text-align: center;
  }

  .line {
    position: relative;
    width: 100%;
    border-bottom: 2px solid black;
    top: 110px;
  }

  .box {
    border-radius: 10px;
    height: 95vh;
    width: 100%;
    text-align: center;
    background: rgb(238, 238, 238);
    position: absolute;
    top: 2%;
    display: flex;
    flex-direction: column;
  }

  form {
    display: grid;
    overflow-y: auto;
    position: relative;
    top: 125px;
    height: 30%;
    width: 98%;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    grid-template-rows: repeat(auto-fit, minmax(100px, 1fr));
    gap: 5px;
    justify-items: flex-start;
    justify-self: center;
    border-top: 2px solid black;
    border-bottom: 2px solid black;
    border-radius: 2px;
    padding-left: 0.5%;
  }
  .flex {
    position: relative;
    top: 200px;
    border-radius: 2px;
    border-top: 2px solid black;
    border-bottom: 2px solid black;
    display: inline-flex;
    flex-direction: row;
    flex-wrap: wrap;
    overflow-y: scroll;
    width: 100%;
    height: 100px;
    align-items: center;
    justify-content: flex-start;
    row-gap: 5%;
    column-gap: 2%;
  }

  .flex:empty {
    display: none;
  }

  .submit,
  .back {
    border-radius: 5px;
    border: 3px solid black;
    background-color: white;
    cursor: pointer;
    font-weight: bold;
    font-size: 15px;
    padding: 5px;
    width: 100px;
    position: absolute;
    justify-self: center;
    bottom: 3%;
  }

  .submit {
    float: right;
    left: calc(75% - 50px);
  }

  .back {
    float: left;
    left: calc(25% - 50px);
  }

  .submit:hover,
  .back:hover {
    background-color: #478bfb;
    color: white;
    transition-duration: 0.1s;
    transform: scale(1.1);
  }

  @keyframes slidein {
    100% {
      top: 2vh;
    }
  }

  @keyframes slideout {
    100% {
      top: 100%;
    }
  }
</style>
