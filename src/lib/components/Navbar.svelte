<div>
  <input type="checkbox" class="toggle-menu" />
  <div class="hamburger" />
  <div class="account">
    <i class="fa fa-cog" aria-hidden="true" />
    <i class="fa fa-user-circle-o" aria-hidden="true" />
    <span class="status"></span>
    <i class="status-tooltip">Status: Online</i>
  </div>
</div>
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
/>

<style>
  div {
    width: 100%;
    height: 10vh;
    position: absolute;
    top: 0;
    background-color: #0193cb;
  }

  .hamburger {
    position: absolute;
    left: 10px;
    top: 20px;
    width: 30px;
    height: 4px;
    background: #fff;
    border-radius: 10px;
    cursor: pointer;
    z-index: 2;
    transition: 0.3s;
  }
  .hamburger:before,
  .hamburger:after {
    content: "";
    position: absolute;
    height: 4px;
    left: 0;
    background-color: #fff;
    border-radius: 10px;
    transition: 0.3s;
  }

  .hamburger:before {
    top: -10px;
    width: 30px;
  }

  .hamburger:after {
    top: 10px;
    width: 30px;
  }

  .toggle-menu {
    position: relative;
    left: 6.5px;
    top: 5px;
    width: 30px;
    height: 30px;
    z-index: 3;
    cursor: pointer;
    opacity: 0;
  }

  input:checked ~ .hamburger {
    background: transparent;
  }

  input:checked ~ .hamburger:before {
    top: 0;
    transform: rotate(-45deg);
    width: 30px;
  }

  input:checked ~ .hamburger:after {
    top: 0;
    transform: rotate(45deg);
    width: 30px;
  }

  .hamburger,
  .toggle-menu {
    display: none;
  }

  .account {
    position: absolute;
    top: 0px;
    width: 100%;
    height: 10vh;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 10vh;
    grid-auto-flow: dense;
    justify-content: center;
    align-items: center;
    justify-items: center;
  }

  .status {
    background-color: lightgreen;
    grid-column: 5;
    height: 10px;
    cursor: pointer;
    width: 10px;
    border-radius: 50%;
    border: 1px solid black;
  }

  .status:hover ~ .status-tooltip {
    opacity: 100%;
  }

  .status-tooltip {
    position: absolute;
    grid-column-start: 5;
    grid-column-end: 6;
    background-color: rgba(200, 200, 200, 0.7);
    padding: 5px 10px;
    border-radius: 2px;
    width: 150px;
    text-align: center;
    left: 25%;
    top: 75%;
    opacity: 0%;
    transition-duration: 1s;
  }

  .fa {
    grid-column: 1;
    font-size: 300%;
    cursor: pointer;
    margin-left: 50%;
    transition-duration: 0.7s;
  }

  .fa-cog {
    grid-column: 9;
  }

  .fa-user-circle-o {
    grid-column: 10;
  }

  .fa:hover {
    color: white;
  }

  @media screen and (max-width: 400px) {
    .hamburger,
    .toggle-menu {
      display: block;
    }
  }
</style>
