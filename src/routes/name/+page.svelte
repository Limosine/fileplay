<script>
// @ts-nocheck

  /**
   * @type {any}
   */
  let name = "";
  let showPlaceholder = true;
  const togglePlaceholder = (event) => {
    if(event.target.value == '')
    showPlaceholder = !showPlaceholder;
  };
</script>

<main>
  <form>
    <label for="name">{name}</label>
    <input
      type="text"
      id="name"
      placeholder={showPlaceholder ? 'Enter your name' : ''}
      bind:value={name}
      on:focusin={togglePlaceholder}
      on:focusout={togglePlaceholder}
    />
  </form>
</main>

<style>
  label {
    text-align: center;
    margin-bottom: 1vh;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-weight: bold;
  }
  input {
    text-align: center;
    height: 110%;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-size: 110%;
    font-weight: bold;
    border-radius: 5px;
    border: solid 3px;
    color: rgb(0, 100, 200);
  }

  form {
    position: absolute;
    height: 85%;
    width: 100%;
    display: grid;
    justify-content: center;
    align-content: center;
  }
</style>
