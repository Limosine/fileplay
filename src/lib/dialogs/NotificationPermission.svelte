<script lang="ts">
    import Dialog, { Title, Content, Actions } from "@smui/dialog";
    import Button, { Label } from "@smui/button";
  
    import { NotificationRequest_open } from "$lib/stores/Dialogs";
  
    function handleContactAddKeyDown(event: CustomEvent | KeyboardEvent) {
      if (!$NotificationRequest_open) return;
      event = event as KeyboardEvent;
  
      if (event.key === "Escape") {
        NotificationRequest_open.set(false);
        closeHandler("cancel");
      } else if (event.key === "Enter") {
        NotificationRequest_open.set(false);
        closeHandler("confirm");
      }
    }
    
    function closeHandler(e: CustomEvent<{ action: string }> | string) {
      let action: string;
  
      if (typeof e === "string") {
        action = e;
      } else {
        action = e.detail.action;
      }
  
      switch (action) {
        case "confirm":
          Notification.requestPermission();
      }
    }
  </script>
  
  <svelte:window on:keydown={handleContactAddKeyDown}/>
  
  <Dialog
    bind:open={$NotificationRequest_open}
    aria-labelledby="title"
    aria-describedby="content"
    on:SMUIDialog:closed={closeHandler}
  >
    <Title id="title">Request notification permission</Title>
    <Content>
      <div>
        Do you want to receive notifications. With notifications you can be reminded. Doesn't work on Bromite.
      </div>
    </Content>
    <Actions>
      <Button action="cancel">
        <Label>No</Label>
      </Button>
      <Button action="confirm">
        <Label>Yes</Label>
      </Button>
    </Actions>
  </Dialog>