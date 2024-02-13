import { browser } from "$app/environment";
import { page } from "$app/stores";
import { get } from "svelte/store";

import { DeviceType } from "./common";
import { rawFiles } from "./UI";

// contacts
export interface IContact {
  cid: number;
  uid: number;
  display_name: string;
  avatar_seed: string;
  linked_at: number;
  devices: IDeviceInfo[];
}

// devices
export interface IDevices {
  self: {
    did: number;
    type: DeviceType;
    display_name: string;
    created_at: number;
    last_seen_at: number;
  };
  others: {
    did: number;
    type: DeviceType;
    display_name: string;
    created_at: number;
    last_seen_at: number;
    is_online: number;
  }[];
}

// device infos
export interface IDeviceInfo {
  did: number;
  type: string;
  display_name: string;
}

// user
export interface IUser {
  uid: number;
  display_name: string;
  avatar_seed: string;
  created_at: number;
}

export const withDeviceType = (name: string) => {
  // @ts-ignore
  return { name, type: DeviceType[name] as string };
};

export const setupGuest = async () => {
  const res = await fetch("/api/setup/guest", {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to setup guestId.");
};

export const deleteAccount = async () => {
  if (get(page).url.hostname == "localhost") return;

  const res = await fetch("/api/user", {
    method: "DELETE",
  });

  if (browser && res) {
    localStorage.removeItem("loggedIn");
    window.location.href = "/setup";
  }
};

export const handleMessage = (
  event: MessageEvent<{ data: any; action: string }>,
) => {
  if (event.data.action == "load-data") {
    const swFiles: File[] = event.data.data;
    const dataTransfer = new DataTransfer();

    swFiles.forEach((file) => {
      dataTransfer.items.add(file);
      rawFiles.set(dataTransfer.files);
    });

    get(page).url.searchParams.delete("share-target");
  }
};
