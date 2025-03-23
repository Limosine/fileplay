import { browser } from "$app/environment";
import { pushState } from "$app/navigation";
import ui from "beercss";
import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { writable } from "svelte/store";

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

class UI {
  // Window
  height = $state(0);
  width = $state(0);
  layout = $derived(this.width < 840 ? "mobile" : "desktop");

  // Navigation
  path = $state<Routes>({ main: "send" });

  // Service worker
  registration = $state<ServiceWorkerRegistration>();

  // Setup
  linkingCode = $state("");
  profaneUsername = $state({
    loading: false,
    profane: false,
  });

  // Input
  input = $state<HTMLInputElement>();
  rawFiles = $state<FileList>();

  files = $state<Files[]>([]);

  syncFiles = () => {
    if (this.rawFiles !== undefined) {
      const rawFiles = this.rawFiles;

      const newFiles = Array.from(rawFiles).filter(
        (raw) => !(this.files.some((file) => raw == file.file) ?? true),
      );
      const removedFiles = this.files.filter(
        (file) => !Array.from(rawFiles).some((raw) => raw == file.file),
      );

      newFiles.forEach((file) => this.files.push({ id: nanoid(), file }));
      removedFiles.forEach((file) => {
        const index = this.files.indexOf(file);
        if (index !== -1) this.files.splice(index, 1);
      });
    }

    console.log("Files synced");
  };

  // Personal infos
  deviceParams = $state([{ display_name: "", type: "" }]);
  userParams = $state({ display_name: "", avatar_seed: "" });

  contacts = $state<IContact[]>([]);
  devices = $state<IDevices>();
  user = $state<IUser>();
  groups = $state<IGroup[]>([]);
  groupDevices = $state<IGroupDevice[]>([]);

  init_props_all = writable(false);
  init_props = $state<InitializedProperties>({
    contacts: false,
    groups: false,
    groupDevices: false,
  });

  initialized(
    type: "user" | "devices" | "contacts" | "groups" | "groupDevices",
  ) {
    if (type == "contacts") {
      this.init_props.contacts = true;
    } else if (type == "groups") {
      this.init_props.groups = true;
    } else if (type == "groupDevices") {
      this.init_props.groupDevices = true;
    }

    if (
      this.user !== undefined &&
      this.devices !== undefined &&
      this.init_props.contacts &&
      this.init_props.groups &&
      this.init_props.groupDevices
    ) {
      this.init_props_all.set(true);
    }
  }

  // Dialogs
  menuDialog = $state<HTMLDialogElement>();
  generalDialog = $state<HTMLDialogElement>();
  largeDialog = $state<HTMLDialogElement>();
  notificationDialog = $state<HTMLDialogElement>();

  dialogProperties = $state<DialogProperties>({
    mode: "unselected",
  });

  groupProperties = $state<
    | {
        mode: "properties";
        gid: number;
      }
    | {
        mode: "create";
      }
  >({ mode: "create" });

  // String utils
  returnSubstring = (name: string, length: number) => {
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
  openLargeDialog = async () => {
    ui("#dialog-large");
  };

  closeDialog = async (success?: boolean) => {
    if (this.generalDialog?.open) {
      if (this.dialogProperties !== undefined) {
        this.dialogProperties.success = success;
      }

      await new Promise<void>((resolve) => {
        ui("#dialog-general");

        setTimeout(() => {
          this.dialogProperties = { mode: "unselected" };
          resolve();
        }, 400); // BeerCSS: --speed3 + 0.1s
      });
    }
  };

  openDialog = async (properties: Exclude<DialogProperties, DialogEdit>) => {
    await this.closeDialog();

    this.dialogProperties = properties;

    return new Promise<boolean>((resolve) => {
      const onClose = () => {
        this.generalDialog?.removeEventListener("close", onClose);

        resolve(this.dialogProperties?.success || false);
      };

      this.generalDialog?.addEventListener("close", onClose);
      ui("#dialog-general");
    });
  };

  openAddDialog = () => {
    if (this.path.main != "groups")
      this.openDialog({
        mode: "add",
        addMode: this.path.main == "contacts" ? "contact" : "device",
      });
    else {
      this.groupProperties = { mode: "create" };
      ui("#dialog-large");
    }
  };

  openEditDialog = async (
    properties: Omit<Omit<DialogEdit, "mode">, "value">,
    value = "",
  ) => {
    await this.closeDialog();

    this.dialogProperties = {
      mode: "edit",
      value,
      ...properties,
    };

    return new Promise<string>((resolve, reject) => {
      const onClose = () => {
        this.generalDialog?.removeEventListener("close", onClose);

        if (this.dialogProperties?.mode == "edit")
          resolve(this.dialogProperties.value);
        else reject("UI: Wrong dialog mode");
      };

      this.generalDialog?.addEventListener("close", onClose);
      ui("#dialog-general");
    });
  };

  // Profanity
  checkProfanity = async () => {
    if (!browser || !this.userParams.display_name) return;

    this.profaneUsername.loading = true;

    this.profaneUsername = {
      loading: false,
      profane: await apiClient("http").checkProfanity(
        this.userParams.display_name,
      ),
    };
  };

  // Path
  getPath = (pathU: string, pathStore?: string): Routes => {
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
      this.path = { main: "send" };
      return { main: "send" };
    } else {
      this.path = object;
      return object;
    }
  };

  changePath = (route: Routes) => {
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
    this.path = route;
  };

  pathBackwards = () => {
    pushState("/" + this.path.main, {});
    if ("sub" in this.path) this.path.sub = undefined;
  };

  // History
  getLastSend = async (mode: "group" | "device" | "contact", id: number) => {
    const timestamp = await getTimestamp(mode, id);
    if (timestamp === undefined) return "";

    const current = dayjs();
    const date = dayjs.unix(timestamp);

    if (current.isSame(date, "day")) return date.format("HH:mm");
    else if (current.isSame(date, "week")) return date.format("dddd");
    else if (current.isSame(date, "year")) return date.format("DD.MM.");
    else return date.format("DD.MM.YY");
  };
}

// Files
interface Files {
  id: string;
  file: File;
  bigChunks?: Blob[];
  smallChunks?: Uint8Array[][];
}

// Personal infos

interface InitializedProperties {
  contacts: boolean;
  groups: boolean;
  groupDevices: boolean;
}

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

export const ui_object = new UI();
