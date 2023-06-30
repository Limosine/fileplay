// events
// sharing_request: receiving request to share
// sharing_cancel: cancel request to share
// share_accepted: other accepted request to share (forwarded by service worker if web push is active)
// share_rejected: other rejected request to share (forwarded by service worker if web push is active)

import { browser } from "$app/environment";
import { writable } from "svelte/store";

export const status = writable<"0" | "1" | "2">("0");

class Messages {
  implementation?: "websockets" | "webpush";
  message: { [key: string]: ((data: any) => Promise<void> | void)[] } = {};
  notificationclick: {
    [key: string]: ((data: any) => Promise<void> | void)[];
  } = {};
  systemmessage: { [key: string]: ((data: any) => Promise<void> | void)[] } =
    {};

  constructor() {
    if (!browser) {
      throw new Error("Messages can only be used in the browser");
    }
  }

  async init() {
    console.log('starting messages.ts init');
    status.set("0");

    if (!localStorage.getItem('loggedIn')) {
      console.log('not logged in, not initializing messages');
      status.set("1");
      return;
    }
    
    if ("serviceWorker" in navigator) {
      const success: boolean = await new Promise((resolve) => {
        // @ts-ignore
        navigator.serviceWorker.onmessage = (msg) => {
          if (msg.data.type === "push_registered") {
            resolve(msg.data.data.success);
          } else {
            console.log('executing system message during init')
            this.systemmessage[msg.data.type]?.forEach(async (listener) => {
              await listener(msg.data.data);
            });
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
              console.log("received message from service worker", msg.data);
              this.message[msg.data.type]?.forEach(async (listener) => {
                await listener(msg.data.data);
              });
              break;
            case "notificationclick":
              console.log(
                "received notificationclick from service worker",
                msg.data
              );
              this.notificationclick[msg.data.type]?.forEach(
                async (listener) => {
                  await listener(msg.data.data);
                }
              );
              break;
            default:
              console.log('received system message from service worker', msg.data)
              this.systemmessage[msg.data.type]?.forEach(async (listener) => {
                await listener(msg.data.data);
              });
              break;
          }
        };
        status.set("1");
        return;
      }
      // TODO setup websockets otherwise, show messages from service worker using displayNotification
      // error if not already returned
      status.set("2");
    }
  }

  dispatchNotificationClick(data: any) {
    console.log("dsipatching notificationclick", data);
    this.notificationclick[data.type]?.forEach(async (listener) => {
      await listener(data);
    });
  }

  onmessage(type: string, listener: (data: any) => Promise<void> | void) {
    if (!this.message[type]) {
      this.message[type] = [];
    }
    this.message[type].push(listener);
  }

  onnotificationclick(
    type: string,
    listener: (data: any) => Promise<void> | void
  ) {
    if (!this.notificationclick[type]) {
      this.notificationclick[type] = [];
    }
    this.notificationclick[type].push(listener);
  }

  onsystemmessage(type: string, listener: (data: any) => Promise<void> | void) {
    if (!this.systemmessage[type]) {
      this.systemmessage[type] = [];
    }
    this.systemmessage[type].push(listener);
  }
}

export const default_messages = new Messages();
