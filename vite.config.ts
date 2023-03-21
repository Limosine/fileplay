import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import type { ConfigEnv, UserConfig } from "vite";
import PWAAssets, { getManifestIcons } from "./scripts";

export default async function (config: ConfigEnv): Promise<UserConfig> {
  return {
    plugins: [
      sveltekit(),
      PWAAssets({
        publicPath: "/pwa-assets",
        src: "static/favicon.png",
        mode: "fit",
      }),
      SvelteKitPWA({
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
        strategies: "injectManifest",
        useCredentials: true,
        devOptions: {
          enabled: true,
          type: "module",
          navigateFallback: "/",
        },
        manifest: Object.assign((await import("./src/manifest.json")).default, {
          icons: getManifestIcons(),
        }),
      }),
    ],
  };
}
