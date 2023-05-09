<script>
  // @ts-nocheck

  import { goto } from "$app/navigation";

  let files = [];

  const addFiles = (e) => {
    if (e.dataTransfer?.files !== undefined) {
      files = e.dataTransfer.files;
    }
    renderBackground();
  };

  function getFileExtension(fileName) {
    let fileExtension;
    fileExtension = fileName.replace(/^.*\./, "");
    return fileExtension;
  }

  function isImage(fileName) {
    var fileExt = getFileExtension(fileName);
    var imagesExtension = ["png", "jpg", "jpeg"];
    if (imagesExtension.indexOf(fileExt) !== -1) {
      return true;
    } else {
      return false;
    }
  }

  const getFileType = (fileName) => {
    let extension = getFileExtension(fileName);
    let type = "alt";
    switch (extension) {
      case "pdf":
        type = extension;
        break;
      case "docx":
      case "doc":
        type = "word";
        break;
      case "xls":
      case "xlsx":
        type = "excel";
        break;
      case "mp3":
      case "ogg":
      case "wav":
        type = "audio";
        break;
      case "mp4":
      case "mov":
        type = "video";
        break;
      case "zip":
      case "7z":
      case "rar":
        type = "archive";
        break;
      case "jpg":
      case "jpeg":
      case "png":
        type = "image";
        break;
      default:
        type = "alt";
    }
    return type;
  };

  function removeClassesByPrefix(el, prefix) {
    for (var i = el.classList.length - 1; i >= 0; i--) {
      if (el.classList[i].startsWith(prefix)) {
        el.classList.remove(el.classList[i]);
      }
    }
  }

  const renderBackground = () => {
    if (files[0]) {
      let reader = new FileReader();
      reader.readAsDataURL(files[0]);
      removeClassesByPrefix(document.getElementById("iconid"), "fa");
      document.getElementById("drop").style.backgroundImage = "none";
      reader.onload = () => {
        if (isImage(files[0].name)) {
          document.getElementById("drop").style.backgroundImage =
            "url(" + reader.result + ")";
        } else {
          document
            .getElementById("iconid")
            .classList.add(
              "fa-regular",
              `fa-file-${getFileType(files[0].name)}`
            );
        }
        document.getElementById("filename").style.alignSelf = "flex-end";
        document.getElementById("next").style.display = "block";
      };
    } else {
      document.getElementById("filename").style.alignSelf = "center";
      removeClassesByPrefix(document.getElementById("iconid"), "fa");
      document.getElementById("drop").style.backgroundImage = "none";
      document.getElementById("next").style.display = "block";
    }
  };

  const trimFileName = (fileName) => {
    if (fileName.length > 19) {
      return fileName.substring(0, 18) + "...";
    }
    return fileName;
  };
</script>

<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
  integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
/>

<div class="content">
  <button id="next" on:click={() => goto("/contacts/select")}>Next</button>
  <label
    for="fileInput"
    id="drop"
    on:dragover|preventDefault
    on:drop|preventDefault={(e) => {
      addFiles(e);
    }}
    on:dragleave|preventDefault
  >
    <span id="filename"
      >{files[0] === undefined
        ? "Drop file or click here"
        : trimFileName(files[0].name)}</span
    >
    <div class="fileicon">
      <i id="iconid" />
    </div>
  </label>
  <input
    type="file"
    name="fileInput"
    id="fileInput"
    bind:files
    on:input={(e) => {
      files = e.target.files;
      renderBackground();
    }}
  />
  <img src="/arrow_up.png" alt="arrow" />
</div>

<style>
  .content {
    z-index: -1000;
  }

  #next {
    position: absolute;
    top: 30%;
    left: calc(50% - 40px);
    width: 80px;
    font-size: 20px;
    border-radius: 5px;
    background-color: rgb(0, 255, 0);
    cursor: pointer;
    border: 2px solid black;
    display: none;
  }

  #next:hover {
    color: grey;
    border-color: grey;
    background-color: white;
  }

  .fileicon {
    width: 100%;
    height: 100%;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .fileicon i {
    font-size: 100px;
    padding-bottom: 20px;
  }

  label {
    position: absolute;
    top: calc(50% - 75px);
    left: calc(50% - 150px);
    width: 300px;
    height: 150px;
    border: 2px dashed #000;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    background-image: none;
    background-size: contain;
  }

  label span {
    position: absolute;
    align-self: center;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-size: 120%;
    padding-left: 10px;
    padding-right: 10px;
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
    top: 70%;
    left: calc(50% - 10px);
    text-align: center;
    max-width: 25px;
    max-height: 50px;
    animation: upAndDown 0.6s infinite alternate;
  }

  .content #fileInput {
    display: none;
  }
</style>
