// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Platform {
      env?: {
        PUBLIC_HOSTNAME: string;
        PUBLIC_VAPID_KEY: string;
      };
    }
  }
}

export {};
