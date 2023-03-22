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
    position: absolute;
    top: 50%;
    left: 50%;
  }

  label {
    text-align: center;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-size: 110%;
    border: 2px solid #000;
    width: 100px;
    border-radius: 5px;
    position: absolute;
    top: 50%;
    left: calc(50% - 50px);
    display: inline-block;
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
    top: 70px;
    margin: 0 auto;
    max-width: 25px;
    max-height: 50px;
    animation: upAndDown 0.6s infinite alternate;
  }

  .content #fileInput {
    display: none;
  }
</style>
