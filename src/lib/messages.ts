// events
// sharing_request: receiving request to share
// sharing_cancel: cancel request to share
// share_accepted: other accepted request to share (forwarded by service worker if web push is active)
// share_rejected: other rejected request to share (forwarded by service worker if web push is active)

import { browser } from "$app/environment";

class Messages {
  implementation?: "websockets" | "webpush";
  message: { [key: string]: ((data: any) => Promise<void> | void)[] } = {};
  notificationclick: { [key: string]: ((data: any) => Promise<void> | void)[] } = {};

  constructor() {
    if (!browser) {
      throw new Error("Messages can only be used in the browser");
    }
  }

  async init() {
    console.log(navigator);
    if ("serviceWorker" in navigator) {
      const success = await new Promise((resolve, reject) => {
        // @ts-ignore
        navigator.serviceWorker.onmessage = (msg) => {
          if (msg.data.type === "push_registered") {
            resolve(msg.data.success);
          }
        };
        // @ts-ignore
        navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({ type: "register_push" });
        });
      });
      console.log(success);
      if (success) {
        console.log("Webpush active");
        this.implementation = "webpush";
        // @ts-ignore
        navigator.serviceWorker.onmessage = async (msg) => {
          console.log("OnMessage: ", msg);
          switch (msg.data.class) {
            case "message":
              console.log("received message", msg.data);
              this.message[msg.data.type]?.forEach(async (listener) => {
                await listener(msg.data);
              });
              break;
            case "notificationclick":
              console.log("received notificationclick", msg.data);
              this.notificationclick[msg.data.type]?.forEach(async (listener) => {
                await listener(msg.data);
              })
              break;
          }
          
        };
        return;
      }
      // TODO setup websockets otherwise
    }
  }

  onmessage(type: string, listener: (data: any) => Promise<void> | void) {
    if (!this.message[type]) {
      this.message[type] = [];
    }
    this.message[type].push(listener);
  }

  onnotificationclick(type: string, listener: (data: any) => Promise<void> | void) { 
    if (!this.notificationclick[type]) {
      this.notificationclick[type] = [];
    }
    this.notificationclick[type].push(listener);
  };
}

export const default_messages = new Messages();
