<script>
  export let id = "id";
  export let checked = false;
</script>

<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
/>

<div>
  <div class="tile">
    <input type="checkbox" {id} on:click bind:checked={checked}/>
    <label for={id}
      ><i class="fa fa-user-circle-o" aria-hidden="true" />
      <h6>{id}</h6>
    </label>
  </div>
</div>

<style>
  * {
    padding: 0px;
    margin: 0px;
    box-sizing: border-box;
  }

  .tile {
    height: 100px;
    width: 100px;
    position: relative;
  }
  input[type="checkbox"] {
    appearance: none;
    position: relative;
    height: 100%;
    width: 100%;
    cursor: pointer;
    outline: none;
    background-color: white;
    border-radius: 10px;
    border: 3px solid black;
    transition: 0.3s;
  }

  input[type="checkbox"]:hover {
    transform: scale(1.08);
  }

  input[type="checkbox"]:checked {
    border: 3px solid #478bfb;
  }

  label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 80%;
    width: 100%;
    position: absolute;
    bottom: 0;
    cursor: pointer;
  }
  label .fa {
    margin-top: -10px;
    font-size: 60px;
    color: #2c2c51;
  }
  input[type="checkbox"]:checked + label .fa{
    color: #478bfb;
    transition: 0.3s;
    animation: grow 0.5s;
  }

  @keyframes grow {
    50% {
        transform: scale(1.5);
    }
  }
  label h6 {
    font-family: "Poppins", sans-serif;
    font-size: 15px;
    font-weight: 400;
    color: #7b7b93;
    margin-top: -7px;
  }
</style>
