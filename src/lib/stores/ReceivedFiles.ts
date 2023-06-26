import { writable } from "svelte/store";

export const files = writable<{
  currentChunks: number;
  currentFiles: number;
  totalFiles: number;
}>({
  currentChunks: 0,
  currentFiles: 0,
  totalFiles: 0,
});

export const connectionOpen = writable<boolean>(false);

class TransferHandler {
  private transferProcesses: FileSharing.TransferFileMessage[] = [];
  private failCounts: {
    transferID: string;
    initFails: number;
    completeFails: number;
  }[] = [];
  receivedRChunks: { transferID: string; chunkIDs: string[] }[] = [];
  sentComplete: string[] = [];

  receivedComplete: string[] = [];
  receivedChunks: {
    transferID: string;
    info: { chunkID: string; fileChunk: string }[];
  }[] = [];
  lastChunk: { transferID: string; date: Date }[] = [];
  receivedTransferAccept: string[] = [];

  isPasswordProtected(transferID: string): boolean {
    const process = this.transferProcesses.find((value) => {
      value.data.transferID == transferID;
    });

    if (!process) return false;
    return process.data.encrypted == "password";
  }

  getProcess(transferID: string): FileSharing.TransferFileMessage | undefined {
    return this.transferProcesses.find((value) => {
      value.data.transferID == transferID;
    });
  }

  confirmAcceptTransfer(
    transferID: string,
    accept: () => void,
    reject: () => void,
    sendAgain: () => void
  ): void {
    const check = () => {
      setTimeout(() => {
        if (!this.receivedTransferAccept.includes(transferID)) {
          const fails = this.getFails(transferID);
          if (fails && fails.initFails >= 3) {
            reject();
          } else {
            this.fail(transferID, true);
            sendAgain();
            check();
          }
        } else {
          accept();
        }
      }, 10 * 1000);
    };
    check();
  }

  checkChunksComplete(
    transferID: string,
    accept: () => void,
    reject: (missingChunks: string[]) => void
  ) {
    const entry = this.transferProcesses.find((message) => {
      message.data.transferID == transferID;
    });
    const receivedData = this.receivedChunks.find((value) => {
      value.transferID == transferID;
    });

    const missingChunks: string[] = [];

    if (entry && receivedData) {
      for (let i = 0; i < entry.data.chunkIDs.length; i++) {
        const id = entry.data.chunkIDs[i];
        const found = receivedData.info.find((value) => {
          value.chunkID == id;
        });
        if (!found) {
          missingChunks.push(id);
        }
      }

      if (missingChunks !== undefined && missingChunks.length != 0) {
        reject(missingChunks);
        return;
      }

      accept();
    }
  }

  confirmComplete(
    transferID: string,
    accept: () => void,
    reject: () => void,
    request: () => void,
    sendAgain: () => void
  ): void {
    const check = () => {
      setTimeout(() => {
        if (!this.receivedComplete.includes(transferID)) {
          const fails = this.getFails(transferID);
          if (
            this.receivedRChunks.find((value) => {
              value.transferID == transferID;
            })
          ) {
            request();
          } else if (fails && fails.completeFails >= 3) {
            reject();
          } else {
            this.fail(transferID, false);
            sendAgain();
            check();
          }
        } else {
          accept();
        }
      }, 10 * 1000);
    };
    check();
  }

  waitForChunks(transferID: string, reject: () => void): void {
    const info = this.receivedChunks.at(-1)?.info;
    if (info) {
      files.set({
        currentChunks: info.length,
        currentFiles: this.receivedChunks.length,
        totalFiles: this.transferProcesses.length,
      });
    }
    setTimeout(() => {
      const currentDate = new Date();
      const lastDate = this.lastChunk.find((value) => {
        value.transferID == transferID;
      });
      if (
        lastDate &&
        currentDate.getTime() > lastDate.date.getTime() &&
        (currentDate.getTime() - lastDate.date.getTime()) / 1000 >= 60
      ) {
        if (this.sentComplete.includes(transferID)) {
          return;
        }

        console.log("Aborting");
        reject();
      }
    }, 60 * 1000);
  }

  addTransferProcess(message: FileSharing.TransferFileMessage): void {
    this.transferProcesses.push(message);
  }

  removeTransferProcess(id: string): void {
    this.transferProcesses = this.transferProcesses.filter((message) => {
      message.data.transferID !== id;
    });
  }

  isTransferRunning(message: FileSharing.TransferFileMessage): boolean {
    return this.transferProcesses.includes(message);
  }

  fail(transferID: string, init: boolean): void {
    this.failCounts.forEach((value, index, array) => {
      if (value.transferID == transferID) {
        array[index] = {
          completeFails: !init ? value.completeFails + 1 : value.completeFails,
          initFails: init ? value.initFails + 1 : value.initFails,
          transferID,
        };
      }
    });
  }

  getFails(
    transferID: string
  ): { initFails: number; completeFails: number } | undefined {
    return this.failCounts.find((value) => {
      value.transferID == transferID;
    });
  }

  removeFails(transferID: string): void {
    this.failCounts.filter((value) => {
      value.transferID != transferID;
    });
  }
}

export const transferHandler = new TransferHandler();
