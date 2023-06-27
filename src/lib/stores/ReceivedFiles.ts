import { writable } from "svelte/store";

export const connectionOpen = writable<boolean>(false);

class TransferHandler {
  private transferProcesses: FileSharing.TransferFileMessage[] = [];
  private finishedTransfers: string[] = [];
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

  isProcessFinished(transferID: string): boolean {
    return this.finishedTransfers.includes(transferID);
  }

  finishProcess(transferID: string): void {
    this.finishedTransfers.push(transferID);
  }

  isPasswordProtected(transferID: string): boolean {
    const process = this.transferProcesses.find((value) => {
      return value.data.transferID == transferID;
    });

    if (!process) return false;
    return process.data.encrypted == "password";
  }

  getProcess(transferID: string): FileSharing.TransferFileMessage | undefined {
    return this.transferProcesses.find((value) => {
      return value.data.transferID == transferID;
    });
  }

  confirmAcceptTransfer(
    transferID: string,
    accept: () => void,
    reject: () => void,
    sendAgain: () => void
  ): void {
    const check = () => {
      let finished = false;

      const interval = setInterval(() => {
        if (this.receivedTransferAccept.includes(transferID)) {
          accept();
          clearInterval(interval);
          finished = true;
        }
      }, 50);

      if (finished) return;
      setTimeout(() => {
        if (!this.receivedTransferAccept.includes(transferID)) {
          const fails = this.getFails(transferID);
          if (fails && fails.initFails >= 3) {
            reject();
            clearInterval(interval);
          } else {
            this.fail(transferID, true);
            sendAgain();
            clearInterval(interval);
            check();
          }
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
      return message.data.transferID == transferID;
    });

    // console.log(entry);
    const receivedData = this.receivedChunks.find((value) => {
      return value.transferID == transferID;
    });

    const missingChunks: string[] = [];

    console.log("Compare: ", entry, receivedData);

    if (entry && receivedData) {
      const info = receivedData.info.map((value) => {
        return value.chunkID;
      });
      const results = entry.data.chunkIDs.filter(
        (item) => info.indexOf(item) == -1
      );
      results.forEach((value) => {
        missingChunks.push(value);
      });
      console.log("MissingChunks: ", missingChunks);
      console.log("TransferHandler: ", this.receivedChunks);
      if (missingChunks !== undefined && missingChunks.length != 0) {
        // console.log("MissingChunks: ", missingChunks);
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
      let count = 0;
      const interval = setInterval(() => {
        if (count >= 20 * 10) {
          clearInterval(interval);
          const fails = this.getFails(transferID);
          if (
            this.receivedRChunks.find((value) => {
              return value.transferID == transferID;
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
          return;
        }
        if (this.receivedComplete.includes(transferID)) {
          accept();
          clearInterval(interval);
        }
        count++;
      }, 50);
    };
    check();
  }

  waitForChunks(
    transferID: string,
    accept: () => void,
    reject: () => void
  ): void {
    if (
      this.transferProcesses.find((value) => {
        return value.data.transferID == transferID;
      })
    ) {
      accept();
    }

    let count = 0;
    const interval = setInterval(() => {
      const currentDate = new Date();
      const lastDate = this.lastChunk.find((value) => {
        return value.transferID == transferID;
      });

      if (count >= 20 * 60) {
        clearInterval(interval);
        reject();
        return;
      }

      if (
        lastDate &&
        currentDate.getTime() > lastDate.date.getTime() &&
        (currentDate.getTime() - lastDate.date.getTime()) / 1000 >= 60
      ) {
        if (this.sentComplete.includes(transferID)) {
          clearInterval(interval);
          return;
        }

        // console.log("Aborting");
        reject();
      }
      count++;
    }, 50);
  }

  getInformation(): {
    currentChunks: number;
    currentFiles: number;
    totalFiles: number;
  } {
    const info = this.receivedChunks.at(-1)?.info;
    if (info) {
      return {
        currentChunks: info.length,
        currentFiles: this.receivedChunks.length,
        totalFiles: this.transferProcesses.length,
      };
    }
    return {
      currentChunks: 0,
      currentFiles: 0,
      totalFiles: 0,
    };
  }

  addTransferProcess(message: FileSharing.TransferFileMessage): void {
    this.transferProcesses.push(message);
  }

  removeTransferProcess(id: string): void {
    this.transferProcesses = this.transferProcesses.filter((message) => {
      return message.data.transferID !== id;
    });
  }

  isTransferRunning(message: FileSharing.TransferFileMessage): boolean {
    const res = this.transferProcesses.filter((value) => {
      return value.data.transferID == message.data.transferID;
    });
    return res.length != 0;
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
      return value.transferID == transferID;
    });
  }

  removeFails(transferID: string): void {
    this.failCounts.filter((value) => {
      return value.transferID != transferID;
    });
  }
}

export const transferHandler = new TransferHandler();
