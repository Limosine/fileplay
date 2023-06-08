import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import type { ConfigEnv, UserConfig } from "vite";
import { config } from "dotenv";
import { ONLINE_STATUS_REFRESH_TIME } from "./src/lib/common";
import EnvironmentPlugin from "vite-plugin-environment";

config();

export default async function (config: ConfigEnv): Promise<UserConfig> {
  return {
    define: {
      ">PUBLIC_VAPID_KEY<": process.env.PUBLIC_VAPID_KEY,
      ">ONLINE_STATUS_REFRESH_TIME<": ONLINE_STATUS_REFRESH_TIME,
    },
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
      }),
    ],
  };
}
