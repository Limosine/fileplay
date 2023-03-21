

<div>
  <input type="checkbox" class="toggle-menu" />
  <div class="hamburger" />

</div>

<style>
  div {
    width: 100vw;
    height: 20vh;
    background-color: purple;
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

  @media screen and (max-width: 400px) {
    .hamburger, .toggle-menu {
        display: block;
    }
  }
</style>
