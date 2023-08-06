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
        DATABASE: D1Database
      };
    }
  }
  
  interface Contact {
    id: string;
    name: string;
  }

  interface IFileInfo {
    file_name: string,
    file_id: string,
    chunk_number: number,
  }
}

export {};
