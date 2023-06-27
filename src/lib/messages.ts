// events
// sharing_request: receiving request to share
// sharing_cancel: cancel request to share
// share_accepted: other accepted request to share (forwarded by service worker if web push is active)
// share_rejected: other rejected request to share (forwarded by service worker if web push is active)

class Messages {
  implementation?: "websockets" | "webpush";
  listeners: { [key: string]: ((data: any) => Promise<void> | void)[] } = {};

  async init() {
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
      if (success) {
        this.implementation = "webpush";
        // @ts-ignore
        navigator.serviceWorker.onmessage = async (msg) => {
          this.listeners[msg.data.type]?.forEach(async (listener) => {
            await listener(msg.data);
          })
        };
        return;
      }
      // TODO setup websockets otherwise
    }
  }

  on(type: string, listener: (data: any) => Promise<void> | void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }
}

export const default_messages = new Messages();
