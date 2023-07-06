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

  enum SendState {
    IDLE = "idle",
    REQUESTING = "requesting",
    REJECTED = "rejected",
    FAILED = "failed",
    CANCELED = "canceled",
    SENDING = "sending",
  }
  
  interface Contact {
    id: string;
    name: string;
  }
}

export {};
