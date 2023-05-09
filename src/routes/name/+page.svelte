<script lang="ts">
  import { enhance } from "$app/forms";

  /**
   * @type {any}
   */
  let name = "";
  let showPlaceholder = true;
  const togglePlaceholder = (event: any) => {
    if (event.target.value == "") showPlaceholder = !showPlaceholder;
  };
</script>

<main>
  <form method="post" action="/name?/submit" on:submit|preventDefault use:enhance>
    <input
      type="text"
      id="name"
      required
      name="name"
      placeholder={showPlaceholder ? "Enter your name" : ""}
      maxlength="16"
      bind:value={name}
      on:focusin={togglePlaceholder}
      on:focusout={togglePlaceholder}
    />

    <label for="name">{name}</label>
  </form>
</main>

<style>
  form {
    position: fixed;
    top: 0;
    z-index: 10000;
    width: 100%;
    display: grid;
    height: 100vh;
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
    padding: 10px 1vw;
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
