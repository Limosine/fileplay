import { get, writable } from "svelte/store";

export enum SendState {
  IDLE = "idle",
  REQUESTING = "requesting",
  REJECTED = "rejected",
  FAILED = "failed",
  CANCELED = "canceled",
  SENDING = "sending",
  SENT = "sent",
}

const createMapStore = () => {
  const store = writable<{ [peerID: string]: number }>({});

  const { subscribe, set, update } = store;
  return {
    subscribe,
    addPair: (peerID: string, cid: number) => {
      const state = get(store);
      if (state[peerID]) return;
      state[peerID] = cid;
      set(state);
    },
    deletePair: (cid: number) => {
      update((state) => {
        Object.keys(state).forEach((key) => {
          if (state[key] == cid) {
            delete state[key];
          }
        });
        return state;
      });
    },
    getCid: (peerID: string) => {
      return get(store)[peerID];
    },
    getPeerID: (cid: number) => {
      const cache = get(store);
      let peerID = "";
      Object.keys(cache).forEach((key) => {
        if (cache[key] == cid) {
          peerID = key;
          return;
        }
      });
      return peerID;
    },
  };
};

const createStore = () => {
  const store = writable<{ [cid: number]: SendState }>([]);
  const { subscribe, set } = store;

  return {
    ...store,
    subscribe,
    setSendState: (cid: number, state: SendState) => {
      const sendState = get(store);
      sendState[cid] = state;
      if (
        [SendState.FAILED, SendState.REJECTED, SendState.CANCELED, SendState.SENT].includes(
          state
        )
      ) {
        setTimeout(() => (sendState[cid] = SendState.IDLE), 3000);
      }
      set(sendState);
    },
    getState: () => {
      return get(store);
    },
  };
};

export const sendState = createStore();
export const mappedIDs = createMapStore();
