import { browser } from "$app/environment";
import { pushState } from "$app/navigation";
import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { derived, get, writable, type Updater } from "svelte/store";

import { apiClient } from "$lib/api/client";
import type { Request } from "$lib/sharing/common";

import type {
  IContact,
  IDevices,
  IGroupDevice,
  IGroup,
  IUser,
} from "./fetchers";
import { getTimestamp } from "./history";

// Window
export const height = writable(0);
export const width = writable(0);
export const layout = derived(width, (width) =>
  width < 840 ? "mobile" : "desktop",
);
export const offline = writable(false);

// Navigation
export const path = writable<Routes>({
  main: "send",
});

// Service worker
export const registration = writable<ServiceWorkerRegistration>();

// Setup
export const linkingCode = writable("");
export const profaneUsername = writable({
  loading: false,
  profane: false,
});

// Input
export const input = writable<HTMLInputElement>();
export const rawFiles = writable<FileList>();
interface Files {
  id: string;
  file: File;
  bigChunks?: Blob[];
  smallChunks?: Uint8Array[][];
}

export let updateFiles: (fn: Updater<Files[]>) => void;
export const files = derived<typeof rawFiles, Files[]>(
  rawFiles,
  (raw, set, update) => {
    updateFiles = update;

    if (raw !== undefined) {
      const tempFiles: { id: string; file: File }[] = [];

      Array.from(raw).forEach((file) => {
        const old = get(files).find((f) => f.file == file);
        if (old === undefined) tempFiles.push({ id: nanoid(), file });
        else tempFiles.push(old);
      });

      set(tempFiles);
    }
  },
  [],
);

// Personal infos
export const deviceParams = writable<
  {
    display_name: string;
    type: string;
  }[]
>([{ display_name: "", type: "" }]);

export const userParams = writable({
  display_name: "",
  avatar_seed: "",
});

export const contacts = writable<IContact[]>([]);
export const devices = writable<IDevices>();
export const user = writable<IUser>();
export const groups = writable<IGroup[]>([]);
export const groupDevices = writable<IGroupDevice[]>([]);

// Dialogs
export const menuDialog = writable<HTMLDialogElement>();
export const generalDialog = writable<HTMLDialogElement>();
export const largeDialog = writable<HTMLDialogElement>();
export const notificationDialog = writable<HTMLDialogElement>();

// Dialog properties
export interface DialogAdd {
  mode: "add";

  addMode: "contact" | "device";
}

export interface DialogEdit {
  mode: "edit";

  title: string;
  value: string;

  length?: number;
  placeholder?: string;
  type: "avatar" | "deviceType" | "string";
}

export type DialogProperties = (
  | DialogAdd
  | DialogEdit
  | {
      mode: "delete" | "qrcode" | "request" | "privacy" | "unselected";
    }
) & { success?: boolean };

export const dialogProperties = writable<DialogProperties>({
  mode: "unselected",
});

export const groupProperties = writable<
  | {
      mode: "properties";
      gid: number;
    }
  | {
      mode: "create";
    }
>({ mode: "create" });

// String utils
export const returnSubstring = (name: string, length: number) => {
  const position = name.lastIndexOf(".");

  if (name.length <= length) return name;

  if (position !== -1) {
    const end = name.slice(position);

    return name.slice(0, length - 1 - end.length) + end;
  } else {
    return name.slice(0, length - 1);
  }
};

// Dialogs
export const openLargeDialog = async () => {
  ui("#dialog-large");
};

export const closeDialog = async (success?: boolean) => {
  if (get(generalDialog)?.open) {
    dialogProperties.update((props) => {
      props.success = success;
      return props;
    });

    await new Promise<void>((resolve) => {
      ui("#dialog-general");

      setTimeout(() => {
        dialogProperties.set({ mode: "unselected" });
        resolve();
      }, 400); // BeerCSS: --speed3 + 0.1s
    });
  }
};

export const openDialog = async (
  properties: Exclude<DialogProperties, DialogEdit>,
) => {
  await closeDialog();

  dialogProperties.set(properties);

  return new Promise<boolean>((resolve, reject) => {
    const onClose = () => {
      get(generalDialog).removeEventListener("close", onClose);

      const dialogProps = get(dialogProperties);
      dialogProps.success ? resolve(dialogProps.success) : resolve(false);
    };

    get(generalDialog).addEventListener("close", onClose);
    ui("#dialog-general");
  });
};

export const openAddDialog = () => {
  if (get(path).main != "groups")
    openDialog({
      mode: "add",
      addMode: get(path).main == "contacts" ? "contact" : "device",
    });
  else {
    groupProperties.set({ mode: "create" });
    ui("#dialog-large");
  }
};

export const openEditDialog = async (
  properties: Omit<Omit<DialogEdit, "mode">, "value">,
  value = "",
) => {
  await closeDialog();

  dialogProperties.set({
    mode: "edit",
    value,
    ...properties,
  });

  return new Promise<string>((resolve, reject) => {
    const onClose = () => {
      get(generalDialog).removeEventListener("close", onClose);

      const dialogProps = get(dialogProperties);
      if (dialogProps.mode == "edit") resolve(dialogProps.value);
      else reject("UI: Wrong dialog mode");
    };

    get(generalDialog).addEventListener("close", onClose);
    ui("#dialog-general");
  });
};

// Profanity
export const checkProfanity = async () => {
  if (!browser || !get(userParams).display_name) return;

  profaneUsername.update((username) => {
    username.loading = true;
    return username;
  });

  profaneUsername.set({
    loading: false,
    profane: await apiClient("http").checkProfanity(
      get(userParams).display_name,
    ),
  });
};

// Path
export const getPath = (pathU: string, pathStore?: string): Routes => {
  if (pathU.charAt(0) == "/") pathU = pathU.slice(1);

  const params = pathU.split("/");

  if (params.length <= 0 || params[0] == "") return { main: "send" };

  let object: Routes | undefined = undefined;

  if (
    params[0] == "send" ||
    params[0] == "receive" ||
    params[0] == "contacts" ||
    params[0] == "groups"
  )
    object = { main: params[0] };
  else if (params[0] == "settings") {
    object = {
      main: "settings",
      sub: params[1] == "devices" ? params[1] : undefined,
    };
  }

  if (object === undefined) {
    path.set({ main: "send" });
    return { main: "send" };
  } else {
    path.set(object);
    return object;
  }
};

export const changePath = (route: Routes) => {
  let url: string;
  if (route.main == "send") {
    url = "/";
  } else {
    url =
      "/" +
      route.main +
      ("sub" in route && route.sub !== undefined ? "/" + route.sub : "");
  }

  pushState(url, {});
  path.set(route);
};

export const pathBackwards = () => {
  path.update((path) => {
    pushState("/" + path.main, {});
    if ("sub" in path) path.sub = undefined;

    return path;
  });
};

// History
export const getLastSend = async (
  mode: "group" | "device" | "contact",
  id: number,
) => {
  const timestamp = await getTimestamp(mode, id);
  if (timestamp === undefined) return "";

  const current = dayjs();
  const date = dayjs.unix(timestamp);

  if (current.isSame(date, "day")) return date.format("HH:mm");
  else if (current.isSame(date, "week")) return date.format("dddd");
  else if (current.isSame(date, "year")) return date.format("DD.MM.");
  else return date.format("DD.MM.YY");
};

// Types & Interfaces

export type Routes = RoutesTop | RouteSettings;

export interface RoutesTop {
  main: "send" | "receive" | "contacts" | "groups";
}

export interface RouteSettings {
  main: "settings";
  sub?: "devices";
}

export type Notification =
  | NotificationRequest
  | NotificationReceiving
  | NotificationReceived;

export interface NotificationRequest {
  title: "File request";
  tag: string;
  body: string;
  data: {
    did: number;
    filetransfer_id: string;
    files: Request["files"];
  };
}

export interface NotificationReceiving {
  title: "Receiving file(s)";
  tag: string;
  body: string;
  data: { did: number; filetransfer_id: string };
}

export interface NotificationReceived {
  title: "File received";
  tag: string;
  body: string;
  data: {
    filename: string;
    url: string;
  };
}
