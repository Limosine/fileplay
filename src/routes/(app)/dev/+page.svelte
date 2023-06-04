<script lang="ts">
  import {
    convertKeyToPEM,
    decryptFile,
    encryptFile,
    extractKeyFromPEM,
    generateKeyPair,
  } from "$lib/FileEncryption";

  const handleChange = async (event: Event) => {
    if (
      event.target &&
      (event.target as HTMLInputElement).files &&
      (event.target as HTMLInputElement).files?.length
    ) {
      const element = event.target as HTMLInputElement;
      if (element.files) {
        const files = element.files;
        const file = files.item(0);
        if (!file) return;

        let keyPair = await generateKeyPair();
        let privateKey = keyPair.privateKey;
        let publicKey = keyPair.publicKey;

        const blob = await encryptFile(file, publicKey);
        if(!blob) return;
        console.log(blob);
        console.log(privateKey)
        const msg = await decryptFile(blob, privateKey);
        console.log(msg)
      }
    }
  };
</script>

<input
  type="file"
  on:change={(e) => {
    handleChange(e);
  }}
/>
