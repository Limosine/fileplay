<script lang="ts">
  import Button, { Label } from "@smui/button";
  import Dialog, {Content, Actions} from "@smui/dialog";

  export let open: boolean = false;
</script>

<Dialog bind:open={open}>
  <Content>
    <p>Content</p>
  </Content>
  <Actions>
    
  </Actions>
</Dialog>
