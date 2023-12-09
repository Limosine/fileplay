import { get } from "svelte/store";
import { browser } from "$app/environment";

import {
  contacts,
  deviceInfos,
  deviceInfos_loaded,
  deviceParams,
  devices,
  devices_loaded,
  own_did,
  user,
  user_loaded,
} from "./UI";
import { DeviceType } from "./common";
import { page } from "$app/stores";
import { idb } from "./idb";
import { liveQuery } from "dexie";

// contacts
export interface IContact {
  cid: number;
  displayName: string;
  avatarSeed: string;
  linkedAt: number;
  lastSeenAt: number;
}

// devices
export interface IDevices {
  self: {
    did: number;
    type: string;
    displayName: string;
    createdAt: number;
    lastSeenAt: number;
  };
  others: {
    did: number;
    type: string;
    displayName: string;
    createdAt: number;
    lastSeenAt: number;
  }[];
}

// device infos
export interface IDeviceInfo {
  cid: number;
  did: number;
  type: string;
  displayName: string;
  peerJsId: string;
  encryptionPublicKey: string;
}

// user
export interface IUser {
  uid: number;
  displayName: string;
  avatarSeed: string;
  createdAt: number;
  lastSeenAt: number;
}

export function withDeviceType(name: string): { type: string; name: string } {
  // @ts-ignore
  return { name, type: DeviceType[name] as string };
}

export async function getPeerJsId(did: number): Promise<string> {
  if (get(page).url.hostname == "localhost") return "";

  const res = await fetch(`/api/guest?did=${did}`, {
    method: "GET",
  });

  const peerJsId: any = await res.json();

  return peerJsId;
}

export const loadInfos = (devices: IDevices, did: number) => {
  let device:
    | {
        did: number;
        type: string;
        displayName: string;
        createdAt: number;
        lastSeenAt: number;
      }
    | undefined;

  if (devices.self.did == did) {
    device = devices.self;
  } else {
    device = devices.others.find((device) => device.did === did);
  }

  if (!device)
    throw new Error("No device with this deviceID is linked to this account.");

  deviceParams.update((deviceParams) => {
    if (!device) return deviceParams;
    deviceParams.displayName = device.displayName;
    deviceParams.type = device.type;
    return deviceParams;
  });

  // original_displayName.set(device.displayName);
  // original_type.set(device.type);

  // device_edit_loaded.set(true);
};

export async function updatePeerJS_ID() {
  if (get(page).url.hostname == "localhost") return;

  const sender_uuid = (await import("../peerjs/common")).sender_uuid;

  await fetch("/api/devices", {
    method: "POST",
    body: JSON.stringify({
      peerJsId: get(sender_uuid),
    }),
  });
}

export async function deleteAccount() {
  if (get(page).url.hostname == "localhost") return;

  const res = await fetch("/api/user", {
    method: "DELETE",
  });

  if (browser && res) {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("encryptionPrivateKey");
    localStorage.removeItem("encryptionPublicKey");
    localStorage.removeItem("encryptionRevocationCertificate");
    window.location.href = "/setup";
  }
}

interface ICombined {
  user?: IUser;
  devices?: IDevices;
  deviceInfos?: IDeviceInfo[];
  contacts?: IContact[];
}

export async function getCombined(request: string[]) {
  if (get(page).url.hostname == "localhost") return [];

  const res = await fetch(`/api/combined?request=${request.toString()}`, {
    method: "GET",
  });

  const result = await (res.json() as Promise<ICombined>);

  if (result.user) {
    user.set(result.user);
    if (!get(user_loaded)) user_loaded.set(true);
  }
  if (result.devices) {
    devices.set(result.devices);
    if (!get(devices_loaded)) devices_loaded.set(true);

    own_did.set(result.devices.self.did);
  }
  if (result.deviceInfos) {
    deviceInfos.set(result.deviceInfos);
    if (!get(deviceInfos_loaded)) deviceInfos_loaded.set(true);
  }
  if (result.contacts) contacts.set(result.contacts);

  return result;
}

export async function getFilesFromIDB(): Promise<FileList> {
  const idbQuery = await idb.indexedFBFileTable.toArray();
  const newFileList = new DataTransfer();
  for(let i = 0; i < idbQuery.length; i++){
    const name = idbQuery[i].name;
    const blob = idbQuery[i].content;
    const file = new File([blob], name, {type: blob.type});
    newFileList.items.add(file);
  }

  idb.indexedFBFileTable.clear();
  return newFileList.files;
}

