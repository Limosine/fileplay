<script>
  export let box_height = 0.5,
    box_width = 0.5;
  export let title = "Title";

  let contacts = [
    { name: "a" },
    { name: "a" },
    { name: "a" },
    { name: "a" },
    { name: "a" },
    { name: "a" },
    { name: "a" },
    { name: "a" },
    { name: "a" },
    { name: "a" },
    { name: "a" },
  ];

  let sizePerItem = 1;
</script>

<div class="backdrop">
  <div
    class="box"
    style="max-height: calc(100vh * {box_height}); max-width: calc(100vw * {box_width});"
  >
    <h1>{title}</h1>
    <div class="line" />
    <form method="post">
      {#each contacts as contact}
        <label> <input type="checkbox" value={contact.name} /></label>
      {/each}
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
    padding: 10px;
    border-radius: 10px;
    margin: 10% auto 10% auto;
    text-align: center;
    background: white;
    display: grid;
  }
  form {
    display: grid;
    height: 100%;
    width: 100%;
    margin-top: 10px;
    margin-bottom: 10px;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    grid-template-rows: repeat(auto-fit, minmax(100px, 1fr));
    gap: 10px;
    justify-items: center;
    align-items: center;
  }

  input {
    display: none;
  }

  label {
    border: 1px solid black;
    justify-self: center;
    width: 100px;
    height: 100px;
    text-align: center;
  }

  label:before {
    border: 1px solid black;
    justify-self: center;
    width: 100px;
    height: 100px;
    text-align: center;
    background-color: red;
  }

  input[type="checkbox"]:checked + label:before,
  label:hover:before {
    color: red;
  }
</style>
