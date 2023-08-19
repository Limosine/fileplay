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
      };
    }
  }

  interface Contact {
    id: string;
    name: string;
  }

  interface IFileInfo {
    file_name: string;
    file_id: string;
    chunk_number: number;
  }

  interface IOutgoingFileTransfer {
    filetransfer_id: string;
    encrypted: "password" | "publicKey";
    completed: boolean;
    files: {
      file: string[];
      chunks: number;
      file_name: string;
      file_id: string;
    }[];
    cid?: number; // not always defined (--> via link)
    did?: number;
  }

  interface IIncomingFiletransfer {
    filetransfer_id: string;
    encrypted: "password" | "publicKey";
    completed: boolean;
    files: {
      file_id: string;
      file_name: string;
      chunk_number: number;
      chunks: string[];
      url?: string; // generated at the end
    }[];
    did: number;
    cid?: number; // no access to cid on guest page
  }
}

export {};
