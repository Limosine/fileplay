import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import type { ConfigEnv, UserConfig } from "vite";
import { generateImages } from "pwa-asset-generator";
import type { ManifestOptions } from "vite-plugin-pwa";

export default async function (config: ConfigEnv): Promise<UserConfig> {
  const { savedImages, htmlMeta, manifestJsonContent } = await generateImages(
    "src/logo.png",
    "static/pwa-assets/",
    {
      darkMode: true,
      favicon: true,
      path: "/pwa-assets/",
      scrape: false,
    }
  );

  return {
    plugins: [
      sveltekit(),
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
        manifest: Object.assign(
          {},
          await import("./src/manifest.json"),
          manifestJsonContent
        ) as unknown as ManifestOptions,
      }),
    ],
  };
}
