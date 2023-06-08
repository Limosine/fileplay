import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import type { ConfigEnv, UserConfig } from "vite";
import { config } from "dotenv";
import PWAAssets, { getManifestIcons } from "./scripts";

config();

export default async function (config: ConfigEnv): Promise<UserConfig> {
  return {
    plugins: [
      sveltekit(),
    ],
  };
}
