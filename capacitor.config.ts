import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "me.fileplay.app",
  appName: "Fileplay",
  webDir: "build-static",
  server: {
    androidScheme: "https",
  },
};

export default config;
