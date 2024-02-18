import { page } from "$app/stores";
import { get } from "svelte/store";

import { DeviceType } from "./common";
import { rawFiles, subscribedToPush } from "./UI";
import { env } from "$env/dynamic/public";
import { apiClient } from "$lib/api/client";

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

export const subscribeWebPush = async (
  registration: ServiceWorkerRegistration,
) => {
  if (Notification.permission == "denied") return;
  else if (Notification.permission == "default") {
    const permission = await Notification.requestPermission();

    if (permission != "granted") return;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: env.PUBLIC_VAPID_KEY,
  });

  subscribedToPush.set(subscription);

  apiClient("ws").sendMessage({
    type: "updateDevice",
    data: {
      update: {
        push_subscription: JSON.stringify(subscription),
      },
    },
  });
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
