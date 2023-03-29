<script>
  // @ts-nocheck

  import { goto } from "$app/navigation";

  // @ts-nocheck

  import Backdrop from "$lib/components/Backdrop.svelte";

  /**
   * @type {any}
   */
  let name = "";
  let showPlaceholder = true;
  const togglePlaceholder = (event) => {
    if (event.target.value == "") showPlaceholder = !showPlaceholder;
  };

  function goHome (event) {
    let keyCode = event.keyCode;
    if (keyCode == 13) {
      goto("/");  
      console.log("Rerouting")
    }
  }
</script>

<main>
  <form on:submit|preventDefault>
    <input
      type="text"
      id="name"
      required
      placeholder={showPlaceholder ? "Enter your name" : ""}
      maxlength="16"
      bind:value={name}
      on:focusin={togglePlaceholder}
      on:focusout={togglePlaceholder}
      on:keydown={goHome}
    />

    <label for="name">{name}</label>
  </form>
</main>

<Backdrop clickHandler="false" />

<style>
  form {
    position: absolute;
    width: 100%;
    display: grid;
    height: 100%;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    justify-content: center;
    align-items: center;
  }

  label {
    grid-row: 2;
    grid-column: 2;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-weight: bold;
    font-size: 2.5vw;
    color: white;
    text-align: center;
    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
      1px 1px 0 #000;
    margin-bottom: 150px;
  }
  input {
    text-align: center;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-weight: bold;
    font-size: 2.5vw;
    border-radius: 5px;
    border: solid 3px;
    padding: 10px 0px;
    color: rgb(0, 100, 200);
    grid-row: 2;
    grid-column: 2;
    margin-top: 10px;
    width: 80%;
    max-width: 80%;
    justify-self: center;
    overflow-x: scroll;
  }
</style>
