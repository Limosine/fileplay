<script lang="ts">
  import Drawer, { Content, Header, Title } from "@smui/drawer";

  import IconButton from "@smui/icon-button";
  import Card, { ActionButtons, ActionIcons, Actions, Content as C_Content } from "@smui/card";
  import Button, { Label } from "@smui/button";
  import { notification_open, notifications } from "$lib/stores/Dialogs";

  let width: number;

  const deleteNotification = (notification: {title: string, content: string}) => {
    $notifications.splice($notifications.indexOf(notification), 1);
    $notifications = $notifications;
  };
</script>

<svelte:window bind:outerWidth={width}></svelte:window>

<div dir="rtl">
  <Drawer class="mdc-top-app-bar--fixed-adjust" dir="ltr" variant="dismissible" bind:open={$notification_open}>
    <Header dir="ltr">
      <Title>Notifications</Title>
    </Header>
    <Content>
      <div class="list-box">
        {#each $notifications as notification}
          <Card>
            <C_Content class="mdc-typography--body2">
              <h6>{notification.title}</h6>
              {notification.content}
            </C_Content>
            <Actions>
              {#if notification.title == "Contact request"}
                <ActionButtons>
                  <Button>
                    <Label>Add</Label>
                  </Button>
                </ActionButtons>
              {/if}
              <ActionIcons>
                <IconButton class="material-icons" on:click={() => deleteNotification(notification)}>
                  close
                </IconButton>
              </ActionIcons>
            </Actions>
          </Card>
        {/each}
      </div>
    </Content>
  </Drawer>
</div>

<slot />

<style>
  * :global(.app-content) {
    padding: 16px;
  }
  .list-box {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 7px;
  }
</style>
