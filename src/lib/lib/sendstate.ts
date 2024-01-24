import { writable } from "svelte/store";

export enum SendState {
  IDLE = "idle",
  REQUESTING = "requesting",
  REJECTED = "rejected",
  FAILED = "failed",
  CANCELED = "canceled",
  SENDING = "sending",
  SENT = "sent",
}

const createStore = () => {
  const store = writable<{ [cid: number]: SendState }>([]);
  const { subscribe, update } = store;

  return {
    subscribe,
    set: (cid: number, state: SendState) => {
      update((store) => {
        store[cid] = state;

        if (
          [
            SendState.FAILED,
            SendState.REJECTED,
            SendState.CANCELED,
            SendState.SENT,
          ].includes(state)
        ) {
          setTimeout(() => (store[cid] = SendState.IDLE), 3000);
        }

        return store;
      });
    },
  };
};

export const sendState = createStore();
