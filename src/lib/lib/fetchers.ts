import { get } from "svelte/store";
import { contacts, deviceInfos, deviceInfos_loaded, deviceParams, devices, devices_loaded, user, user_loaded } from "./UI";
import { DeviceType } from "./common";
import { own_did } from "./UI";

// contacts
export interface IContact {
  cid: number;
  displayName: string;
  avatarSeed: string;
  linkedAt: number;
  lastSeenAt: number;
}

async function getContacts(): Promise<IContact[]> {
  return fetch("/api/contacts", {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  })
    .then(async (res) => (await res.json()) as IContact[])
    .catch(() => [] as IContact[]);
}

export async function updateContacts(): Promise<void> {
  contacts.set(await getContacts());
}

export function updateContactsAsync(): void {
  contacts.set(getContacts());
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
};

export async function getDevices(): Promise<IDevices> {
  const res = await fetch("/api/devices", {
    method: "GET",
  });

  const devices_new: any = await res.json();

  own_did.set(devices_new.self.did);

  devices.set(devices_new);
  if (!get(devices_loaded)) devices_loaded.set(true);

  return devices_new;
}

// device infos
export interface IDeviceInfos {
  cid: number;
  type: string;
  displayName: string;
  peerJsId: string;
  encryptionPublicKey: string;
}[];

export async function getDeviceInfos(): Promise<IDeviceInfos> {
  const res = await fetch("/api/contacts/devices", {
    method: "GET",
  });

  const deviceInfos_new: any = await res.json();

  deviceInfos.set(deviceInfos_new);
  if (!get(deviceInfos_loaded)) deviceInfos_loaded.set(true);

  return deviceInfos_new;
}

export function withDeviceType(name: string): { type: string; name: string; } {
  // @ts-ignore
  return { name, type: DeviceType[name] as string };
}

// user
export interface IUser {
  uid: number;
  displayName: string;
  avatarSeed: string;
  createdAt: number;
  lastSeenAt: number;
};

export async function getUserInfo(): Promise<IUser> {
  const res = await fetch("/api/user", {
    method: "GET",
  });

  const user_new: any = await res.json();

  user.set(user_new);
  if (!get(user_loaded)) user_loaded.set(true);

  return user_new;
}

export async function getPeerJsId(did: number): Promise<string> {
  const res = await fetch(`/api/guest?did=${did}`, {
    method: "GET",
  });

  const peerJsId: any = await res.json();

  return peerJsId;
};

export const loadInfos = (
  devices: IDevices,
  did: number
) => {
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
  const sender_uuid = (await import("../peerjs/common")).sender_uuid;

  await fetch("/api/devices", {
    method: "POST",
    body: JSON.stringify({
      peerJsId: get(sender_uuid),
    }),
  });
};

export function getContent() {
  getUserInfo();
  updateContactsAsync();
  getDevices();
  getDeviceInfos();
}
