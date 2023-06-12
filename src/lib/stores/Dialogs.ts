import { get, writable } from "svelte/store";
import { browser } from "$app/environment";


export const contacts_drawer_open = writable(false);

export const notification_open = writable(false);

export const select_open = writable(false);

export const add_open = writable(false);

export const settings_open = writable(false);
export const active = writable("Account");
export const editDevice_open = writable(false);

export const codehostname = writable("");

export const notifications = writable<{title: string, content: string}[]>([]);

export const deviceParams = writable({
  displayName: "",
  type: "",
  encryptionPublicKey: "",
});

export const userParams = writable({
  displayName: "",
  avatarSeed: "",
});

export const original_username = writable<string>("");
export const original_avatarSeed = writable<string>("");
export const original_displayName = writable<string>("");
export const original_type = writable<string>("");
export const deviceID = writable<number>();

export const profaneUsername = writable<{ loading: boolean; profane: boolean }>({
  loading: false,
  profane: false,
});

export const setupLoading = writable(false);

export function updateIsProfaneUsername() {
  if (!browser || !get(userParams).displayName) return;
  profaneUsername.set({loading: true, profane: get(profaneUsername).profane});
  fetch("/api/checkIsUsernameProfane", {
    method: "POST",
    body: JSON.stringify({
      username: get(userParams).displayName,
    }),
  })
    .then((res) => res.json())
    .then((json) => {
      profaneUsername.set({loading: get(profaneUsername).loading, profane: json.isProfane});
      profaneUsername.set({loading: false, profane: get(profaneUsername).profane});
    })
    .catch((e) => {
      console.error(e);
      profaneUsername.set({loading: false, profane: false});
    });
}
