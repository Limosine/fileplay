// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { D1Database } from "@cloudflare/workers-types";
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      // the authenticated user id
      userId: string;
    }
    // interface PageData {}
    interface Platform {
      env?: {
        DATABASE: D1Database;
        MESSAGE_WS: DurableObjectNamespace;
      };
    }
  }

  namespace FileSharing {
    interface Message {
      type: string;
      data: {};
    }

    interface TransferFileMessage extends Message {
      type: "TransferFile";
      data: {
        chunkIDs: string[];
        transferID: string;
        fileName: string;
        encrypted: "publickey" | "password";
      };
    }

    interface TransferChunkMessage {
      type: "TransferChunk";
      /**This is the chunk ID. */
      data: {
        fileChunk: string;
        chunkID: string;
        transferID: string;
      };
    }

    interface AcceptTransferMessage {
      type: "AcceptTransfer";
      /**This is the transfer ID. */
      data: string;
    }

    interface RequestChunk {
      type: "RequestChunk";
      /**This is the chunk ID. */
      data: {
        transferID: string;
        chunkIDs: string[];
      };
    }

    interface SendComplete {
      type: "SendComplete";
      /**This is the transfer ID. */
      data: string;
    }

    interface ReceiveComplete {
      type: "ReceiveComplete";
      /**This is the transfer ID. */
      data: string;
    }
  }
  interface Contact {
    id: string;
    name: string;
  }
}

export {};
