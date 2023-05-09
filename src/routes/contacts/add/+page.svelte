<script lang="ts">
  // export prop ()
  export let data;

  console.log(data.code);
  const copy = (e: any) => {
    let element = document.getElementsByClassName("code").item(0);
  }
</script>

<div class="box">
    <div class="code">
        {data?.code ?? ''}
    </div>
    <button on:click={copy}>
        Copy
    </button>
</div>

<style>
  .box {
    border-radius: 10px;
    height: 95vh;
    width: 100%;
    text-align: center;
    background: rgb(238, 238, 238);
    position: absolute;
    top: 2%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }

  .code {
    border: 2px solid black;
    padding: 30px;
    border-radius: 5px;
  }

  button {
    padding: 26px;
    border: 2px solid black;
    margin-left: 20px;
    border-radius: 5px;
    cursor: pointer;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-weight: bold;
    font-size: 16px;
  }
</style>
