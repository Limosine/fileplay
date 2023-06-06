import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import type { ConfigEnv, UserConfig } from "vite";
import { config } from "dotenv";
import PWAAssets, { getManifestIcons } from "./scripts";
import nodeExternals from 'rollup-plugin-node-externals'
config();

export default async function (config: ConfigEnv): Promise<UserConfig> {
  return {
    plugins: [
      nodeExternals(),
      sveltekit(),
      PWAAssets({
        publicPath: "/pwa-assets",
        src: "static/favicon.png",
        mode: "fit",
        background: "#f00",
      }),
      SvelteKitPWA({
        srcDir: "src",
        filename: "sw.ts",
        registerType: "prompt",
        strategies: "injectManifest",
        useCredentials: !process.env.CF_PROD, // disabled in production
        devOptions: {
          enabled: false,
          type: "module",
          navigateFallback: "/",
        },
        manifest: Object.assign((await import("./src/manifest.json")).default, {
          icons: getManifestIcons(),
        }), // enable sourcemap in dev
      }),
    ],
    build: {
    },
  };
}
