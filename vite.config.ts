import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import type { ConfigEnv, UserConfig } from "vite";
import { config } from "dotenv";
import EnvironmentPlugin from "vite-plugin-environment";
config();

export default async function (config: ConfigEnv): Promise<UserConfig> {
  return {
    plugins: [
      EnvironmentPlugin(["NODE_ENV"]),
      sveltekit(),
      SvelteKitPWA({
        srcDir: "src",
        filename: "service-worker.ts",
        registerType: "prompt",
        strategies: "injectManifest",
        useCredentials: true,
        devOptions: {
          enabled: false,
        },
        manifest: await import("./static/manifest.json"),
      }),
    ],
    ssr: {
      noExternal: ["beercss"],
    },
  };
}
