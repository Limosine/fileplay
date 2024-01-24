import { get, writable } from "svelte/store";

export enum SendState {
  IDLE = "Idle",
  REQUESTING = "Requesting",
  REJECTED = "Rejected",
  FAILED = "Failed",
  CANCELED = "Canceled",
  SENDING = "Sending",
  SENT = "Sent",
}

const createStore = () => {
  const store = writable<{ [cid: number]: SendState }>([]);
  const { subscribe, update, set } = store;

  return {
    subscribe,
    set: (cid: number, state: SendState) => {
      update((object) => {
        object[cid] = state;

        if (
          [
            SendState.FAILED,
            SendState.REJECTED,
            SendState.CANCELED,
            SendState.SENT,
          ].includes(state)
        ) {
          setTimeout(() => {
            const object = get(store);
            object[cid] = SendState.IDLE;
            set(object);
          }, 3000);
        }

        return object;
      });
    },
  };
};

export const sendState = createStore();
