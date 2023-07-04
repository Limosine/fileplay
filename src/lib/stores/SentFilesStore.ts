import { get, writable } from "svelte/store";

const createStore = () => {
  const store = writable<
    { peerID: string; sentChunks: number; totalChunks: number }[]
  >([]);

  const { subscribe, set, update } = store;

  return {
    subscribe,
    sendChunk: (peerID: string) => {
      const storeArray = get(store);
      storeArray.forEach((value, index, arr) => {
        if (value.peerID == peerID) {
          arr[index] = {
            peerID,
            sentChunks: value.sentChunks + 1,
            totalChunks: value.totalChunks,
          };
          return;
        }
      });
      set(storeArray);
    },
    initiateTransfer: (peerID: string, totalChunks: number) => {
      update((value) => {
        return [
          ...value,
          {
            peerID,
            sentChunks: 0,
            totalChunks,
          },
        ];
      });
    },
    freeData: () => {
      set(
        get(store).filter((value) => {
          return value.sentChunks == value.totalChunks;
        })
      );
    },
  };
};

export const sentChunksStore = createStore();
