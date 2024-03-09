import { App } from "@capacitor/app";
import { AppLauncher } from "@capacitor/app-launcher";
import { Filesystem } from "@capacitor/filesystem";
import { SendIntent } from "send-intent";

import { arrayToFileList } from "./fetchers";
import { rawFiles } from "./UI";

const checkShare = async () => {
  try {
    const result = await SendIntent.checkSendIntentReceived();

    if (result && result.url) {
      await AppLauncher.openUrl({
        url: `me.fileplay.app://?path=${JSON.stringify(result)}`,
      });
    }

    SendIntent.finish();
  } catch (e: any) {
    console.warn(e);
  }
};

export const addListeners = async () => {
  await checkShare();

  window.addEventListener("sendIntentReceived", () => {
    checkShare();
  });

  await checkFiles();

  App.addListener("appUrlOpen", () => {
    checkFiles();
  });
};

const base64ToBlob = (
  base64: string,
  contentType?: string,
  sliceSize = 512,
) => {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

const getFiles = async (properties: {
  title: string;
  type: string;
  url: string;
  additionalItems?: { title: string; type: string; url: string }[];
}) => {
  const files: File[] = [];

  const readFile = async (title: string, type: string, url: string) => {
    const { data } = await Filesystem.readFile({
      path: decodeURIComponent(url),
    });

    files.push(
      new File(
        [typeof data === "string" ? base64ToBlob(data, type) : data],
        title,
        { type },
      ),
    );
  };

  await readFile(properties.title, properties.type, properties.url);
  if (properties.additionalItems !== undefined) {
    for (const index of properties.additionalItems.keys()) {
      await readFile(
        properties.additionalItems[index].title,
        properties.additionalItems[index].type,
        properties.additionalItems[index].url,
      );
    }
  }

  return files;
};

export const checkFiles = async () => {
  const url = await App.getLaunchUrl();

  if (url !== undefined) {
    const parsed = new URL(url.url);
    const json = parsed.searchParams.get("path");

    if (json !== null) {
      const object = JSON.parse(json);

      const files = await getFiles(object);
      rawFiles.set(arrayToFileList(files));
    }
  }
};
