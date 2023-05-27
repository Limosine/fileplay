import sharp from "sharp";
import type { Plugin, ViteDevServer } from "vite";

type Selection = "dark" | "splash" | "maskable";
type Format = "jpeg" | "jpg" | "png" | "webp";

interface ItemConfig {
  mode: "cut" | "fit";
  width: number;
  height: number;
  _features?: Selection[];
  src?: string;
  paddingPercent?: number;
  opaque?: boolean;
  background?: string;
  dest: "html" | "manifest";
  linkrel?: string;
  media?: string;
  format?: Format;
}

interface PWAAssetsConfig {
  src?: string; // src image path
  publicPath?: string; // default '/pwa-assets'
  maskablePaddingPercent?: number;
  mode?: "cut" | "fit";
  opaque?: boolean;
  background?: string;
  select?: Selection[]; // select which features to generate
  _toGenerate?: ItemConfig[];
  defaultFormat?: Format;
}

const DEFAULT_PWA_ASSETS_CONFIG: Omit<Required<PWAAssetsConfig>, "src"> = {
  publicPath: "/pwa-assets",
  maskablePaddingPercent: 15,
  opaque: true,
  mode: "fit",
  background: "#fff",
  select: ["dark", "splash", "maskable"],
  _toGenerate: (await import("./generate.json")).default as ItemConfig[],
  defaultFormat: "jpeg",
};

export function getManifestIcons(config?: PWAAssetsConfig): object[] {
  const globalconfig = Object.assign({}, DEFAULT_PWA_ASSETS_CONFIG, config);
  if (!globalconfig.publicPath.startsWith("/")) {
    globalconfig.publicPath = "/" + globalconfig.publicPath;
  }
  if (config && config.select && config.select.length === 0) {
    globalconfig.select = DEFAULT_PWA_ASSETS_CONFIG.select;
  }

  const manifestIcons: object[] = [];
  for (const itemconfig of globalconfig._toGenerate.map((x) =>
    defaultItemConfig(x, globalconfig)
  )) {
    if (
      itemconfig._features.filter((x) => !globalconfig.select.includes(x))
        .length === 0
    ) {
      if (itemconfig.dest === "manifest") {
        const sizes = `${itemconfig.width}x${itemconfig.height}`;
        const purpose = itemconfig._features?.includes("maskable")
          ? "maskable"
          : "any";
        manifestIcons.push({
          type: "image/" + itemconfig.format,
          purpose,
          sizes,
          src: assetURL(itemconfig, globalconfig),
        });
      }
    }
  }
  return manifestIcons;
}

async function generate(
  src: sharp.Sharp | undefined,
  config: Omit<Required<PWAAssetsConfig>, "src">,
  item: ItemConfig
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const itemconfig: Omit<Required<ItemConfig>, "src" | "linkrel" | "media"> &
      Partial<Pick<Required<ItemConfig>, "src" | "linkrel" | "media">> =
      defaultItemConfig(item, config);

    if (itemconfig.src) {
      src = sharp(itemconfig.src);
    }

    if (!src) {
      // raise this file not generated exception
      return reject("No source image provided!");
    }
    const { width, height } = await src.metadata();
    if (!width || !height) {
      return reject("Invalid source image!");
    }
    const paddedPercent = (x: number) =>
      Math.ceil((x * itemconfig.paddingPercent) / 100);

    return resolve(
      src
        .clone()
        .extend({
          top: paddedPercent(height),
          left: paddedPercent(width),
          bottom: paddedPercent(height),
          right: paddedPercent(width),
          background: itemconfig.background,
        })
        .resize({
          width: itemconfig.width,
          height: itemconfig.height,
          background: itemconfig.background,
          fit: itemconfig.mode == "fit" ? "contain" : "cover",
          position: "center",
        } satisfies sharp.ResizeOptions)
        .toFormat(itemconfig.format)
        .toBuffer()
    );
  });
}

function URLPrefixed(url: string, globalconfig: PWAAssetsConfig) {
  return `${globalconfig.publicPath}/${url}`;
}

function assetURL(itemconfig: ItemConfig, globalconfig: PWAAssetsConfig) {
  const sizes = `${itemconfig.width}x${itemconfig.height}`;
  const purpose = itemconfig._features?.includes("maskable")
    ? "maskable"
    : "any";
  return URLPrefixed(
    `${itemconfig.dest}-` +
      (itemconfig.dest === "html" ? `${itemconfig.linkrel}-` : `${purpose}-`) +
      `${sizes}.${itemconfig.format}`,
    globalconfig
  );
}

function defaultItemConfig(
  itemconfig: ItemConfig,
  globalconfig: Omit<Required<PWAAssetsConfig>, "src">
) {
  return Object.assign(
    { _features: [] as Selection[] },
    {
      paddingPercent: itemconfig._features?.includes('maskable') ? globalconfig.maskablePaddingPercent : 0,
      opaque: globalconfig.opaque,
      background: globalconfig.background,
      format: globalconfig.defaultFormat,
    },
    { height: itemconfig.width, width: itemconfig.height },
    itemconfig
  );
}

export default function PWAAssets(config?: PWAAssetsConfig) {
  const virtualModuleId = "virtual:pwa-assets";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;

  const files: Map<string, Promise<Buffer>> = new Map();
  const globalconfig = Object.assign({}, DEFAULT_PWA_ASSETS_CONFIG, config);
  if (!globalconfig.publicPath.startsWith("/")) {
    globalconfig.publicPath = "/" + globalconfig.publicPath;
  }
  if (config && config.select && config.select.length === 0) {
    globalconfig.select = DEFAULT_PWA_ASSETS_CONFIG.select;
  }

  return {
    name: "PWAAssets", // required, will show up in warnings and errors
    buildStart() {
      let src: sharp.Sharp | undefined;
      if (globalconfig.src) {
        src = sharp(globalconfig.src);
      }
      for (const itemconfig of globalconfig._toGenerate.map((x) =>
        defaultItemConfig(x, globalconfig)
      )) {
        if (
          itemconfig._features.filter((x) => !globalconfig.select.includes(x))
            .length === 0
        ) {
          files.set(
            assetURL(itemconfig, globalconfig),
            generate(src, globalconfig, itemconfig)
          );
        }
      }
    },
    resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    async generateBundle() {
      const filemap = new Map<string, Buffer | undefined>();
      await Promise.all(
        Array.from(files.entries()).map(async ([url, datapromise]) => {
          filemap.set(url, await datapromise);
        })
      );

      // emit all static files
      filemap.forEach((data, url) => {
        if (!data) return;
        this.emitFile({
          type: "asset",
          fileName: url.substring(1),
          source: data,
        });
      });
    },
    async configureServer(server: ViteDevServer) {

      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, "a://b.c").pathname;
        if (files.has(url)) {
          res.statusCode = 200;
          res.end(await files.get(url));
        } else {
          return next();
        }
      });
    },
    async load(id: string) {
      if (id === resolvedVirtualModuleId) {
        const manifestImages: object[] = [];
        const HTMLImageTags: string[] = [];

        for (const itemconfig of globalconfig._toGenerate.map((x) =>
          defaultItemConfig(x, globalconfig)
        )) {
          if (
            itemconfig._features.filter((x) => !globalconfig.select.includes(x))
              .length === 0
          ) {
            if (itemconfig.dest === "manifest") {
              const sizes = `${itemconfig.width}x${itemconfig.height}`;
              const purpose = itemconfig._features?.includes("maskable")
                ? "maskable"
                : "any";
              manifestImages.push({
                type: "image/" + itemconfig.format,
                purpose,
                sizes,
                src: assetURL(itemconfig, globalconfig),
              });
            } else if (itemconfig.dest === "html") {
              const sizes = `${itemconfig.width}x${itemconfig.height}`;
              HTMLImageTags.push(
                `<link rel="${
                  itemconfig.linkrel
                }" sizes="${sizes}" href="${assetURL(
                  itemconfig,
                  globalconfig
                )}"` +
                  (itemconfig.media !== undefined
                    ? ` media="${itemconfig.media}"`
                    : "") +
                  `>`
              );
            }
          }
        }
        return `export const manifestIcons = ${JSON.stringify(
          manifestImages
        )}\nexport const HTMLImageTags = ${JSON.stringify(HTMLImageTags)}`;
      }
    },
  } satisfies Plugin;
}
