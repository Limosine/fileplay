import { page } from "$app/stores";
import { get } from "svelte/store";

import { DeviceType } from "./common";
import { rawFiles } from "./UI";

// Contacts
export interface IContact {
  cid: number;
  uid: number;
  display_name: string;
  avatar_seed: string;
  linked_at: number;
  devices: IDeviceInfo[];
}

// Devices
export interface IDevices {
  self: {
    did: number;
    type: DeviceType;
    display_name: string;
    created_at: number;
  };
  others: {
    did: number;
    type: DeviceType;
    display_name: string;
    created_at: number;
  }[];
}

// Device infos
export interface IDeviceInfo {
  did: number;
  type: string;
  display_name: string;
}

// User
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

// Service worker
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
