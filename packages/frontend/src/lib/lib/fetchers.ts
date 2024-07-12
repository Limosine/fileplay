import { page } from "$app/stores";
import { get } from "svelte/store";
import type { z } from "zod";

import {
  contacts,
  devices,
  groupDevices,
  groups,
  user,
} from "../../../../common/api/common";

import { rawFiles } from "./UI";

// User
export type IUser = z.infer<typeof user>["data"];

// Devices
export type IDevices = z.infer<typeof devices>["data"];
export type IDeviceInfo = z.infer<typeof contacts>["data"][0]["devices"][0];

// Contacts
export type IContact = z.infer<typeof contacts>["data"][0];

// Groups
export type IGroup = z.infer<typeof groups>["data"][0];
export type IGroupDevice = z.infer<typeof groupDevices>["data"][0];

// Conversion
export const arrayToFileList = (files: File[]) => {
  const dataTransfer = new DataTransfer();

  for (const file of files) {
    dataTransfer.items.add(file);
  }

  return dataTransfer.files;
};

// Service worker
export const handleMessage = (
  event: MessageEvent<{ data: any; action: string }>,
) => {
  if (event.data.action == "load-data") {
    rawFiles.set(arrayToFileList(event.data.data));

    get(page).url.searchParams.delete("share-target");
  }
};
