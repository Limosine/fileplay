import { get, writable } from "svelte/store";

const createFinishedTransfers = () => {
  const store = writable<string[]>([]);
  const { subscribe, update } = store;

  return {
    ...store,
    subscribe,
    addTransfer: (fileID: string) => {
      update((value) => {
        return (value = [...value, fileID]);
      });
      console.log("Finished: ", get(store))
    },
  };
};

const createReceivedChunks = () => {
  const store = writable<
    {
      fileID: string;
      fileName: string;
      encrypted: string;
      chunkNumber: number;
      chunks: string[];
    }[]
  >([]);

  const { subscribe, set, update } = store;

  return {
    ...store,
    subscribe,
    addChunk: (fileID: string, chunk: string) => {
      let currentState = get(store);
      currentState.forEach((value, index, arr) => {
        if (value.fileID == fileID) {
          arr[index].chunks.push(chunk);
        }
      });
      console.log("Setting");
      set(currentState);
      console.log(currentState);
    },
    getInformation: (fileID: string) => {
      return get(store).find((value) => {
        return value.fileID == fileID;
      });
    },
    addInformation: (
      fileID: string,
      fileName: string,
      encrypted: "password" | "publicKey",
      chunkNumber: number,
      chunks: any[]
    ) => {
      update((value) => {
        console.log("Updating");
        return (value = [
          ...value,
          {
            chunkNumber,
            chunks,
            encrypted,
            fileID,
            fileName,
          },
        ]);
      });
      console.log(get(store));
    },
  };
};

export const receivedChunks = createReceivedChunks();
export const finishedTransfers = createFinishedTransfers();
