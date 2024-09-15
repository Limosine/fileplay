import { writable } from "svelte/store";

class VisibleError {
  overlay = $state<"" | "hidden">("");
  readonly error = writable<false | { icon: string; text: string }>(false);

  solved = () => {
    this.error.set(false);
    this.overlay = "hidden";
  };

  offline = () => {
    this.error.set({
      icon: "cloud_off",
      text: "Offline, please connect to the internet.",
    });
    this.overlay = "";
  };

  unauthorized = () => {
    this.error.set({
      icon: "warning",
      text: "Unauthorized, forwarding to setup.",
    });
    this.overlay = "";

    setTimeout(() => (location.href = "/setup"), 2000);
  };
}

export const error = new VisibleError();
