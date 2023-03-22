<div>
  <input type="checkbox" class="toggle-menu" />
  <div class="hamburger" />
  <div class="account">
    <i class="fa fa-user-circle-o" aria-hidden="true" />
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
    float: right;
    position: absolute;
    right: 0;
    top: 0px;
    width: 60px;
  }
  .fa {
    margin: 25% 0 50% 0;
    font-size: 300%;
    cursor: pointer;
  }

  .fa:hover {
    transition-duration: 0.5s;
    color: white;
  }

  @media screen and (max-width: 400px) {
    .hamburger,
    .toggle-menu {
      display: block;
    }
  }
</style>
