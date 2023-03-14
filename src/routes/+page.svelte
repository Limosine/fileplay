<main>
    <div>
        <h1>fileplay.me</h1>

        <div class="content">
            <label for="fileInput">Share File</label>
            <input type="file" name="fileInput" id="fileInput" />

            <img src="arrow_up.png" alt="arrow" />
        </div>
    </div>
</main>

<style>
    h1 {
        margin: 0px;
        padding: 20px;
        text-align: center;
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        font-size: 30px;
        background: rgba(0, 100, 255);
    }
    .content {
        display: grid;
        justify-content: center;
        align-content: center;
        height: 80vh;
    }

    label {
        text-align: center;
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        font-size: 110%;
        border: 2px solid #000;
        border-radius: 5px;
        display: inline-block;
        padding: 6px 12px;
        cursor: pointer;
    }

    @keyframes upAndDown {
        0% {

        }

        50% {
            transform: translateY(-100px);
        }
        100% {
            transform: translateY(100px);
        }
    }

    img {
        position: relative;
        top: 10px;
        margin: 0 auto;
        max-width: 25px;
        max-height: 50px;
        animation-name: upAndDown;
        animation-duration: 1s;
        animation-iteration-count: infinite;
    }

    .content #fileInput {
        display: none;
    }

    
</style>
