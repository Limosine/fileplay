import { get, writable } from "svelte/store";

const createStore = () => {
  const store = writable<{ [cid: number]: SendState }>([]);
  const { subscribe, set } = store;

  return {
    subscribe,
    setSendState: (cid: number, state: SendState) => {
      const sendState = get(store);
      sendState[cid] = state;
      if (
        [SendState.FAILED, SendState.REJECTED, SendState.CANCELED].includes(
          state
        )
      ) {
        setTimeout(() => (sendState[cid] = SendState.IDLE), 1000);
      }
      set(sendState);
    },
    getState: () => {
      return get(store);
    },
  };
};

export const sendState = createStore();
