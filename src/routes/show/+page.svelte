<script lang="ts">
  export let data: import("./$types").PageData
</script>

<div>
  {#each data.files as file}
    <div>
      <h1>Name: {file.name}</h1>
      <p>Size: {file.size}</p>
      <a href={URL.createObjectURL(file)} download={file.name}>download</a>
    </div>
  {/each}
</div>
