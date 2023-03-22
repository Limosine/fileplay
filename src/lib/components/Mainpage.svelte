<main>
  <div>
    <div class="content">
      <label for="fileInput">Share File</label>
      <input type="file" name="fileInput" id="fileInput" />

      <img src="arrow_up.png" alt="arrow" />
    </div>
  </div>
</main>

<style>
  .content {
    z-index: -1000;
    position: absolute;
    height: 100%;
    width: 100%;
  }

  label {
    position: absolute;
    top: 47%;
    left: calc(50% - 50px);
    width: 100px;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-size: 110%;
    border: 2px solid #000;
    border-radius: 5px;
    padding: 6px 12px;
    cursor: pointer;
  }

  @keyframes upAndDown {
    0% {
      transform: translateY(20px);
    }

    100% {
      transform: translateY(-20px);
    }
  }

  img {
    position: absolute;
    top: 57%;
    left: 50%;
    text-align: center;
    max-width: 25px;
    max-height: 50px;
    animation: upAndDown 0.6s infinite alternate;
  }

  .content #fileInput {
    display: none;
  }
</style>
