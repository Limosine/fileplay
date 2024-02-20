import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const adapter = process.env.ADAPTER === "node" ? adapterNode : adapterStatic;
const adapterConfig =
  process.env.ADAPTER === "node"
    ? {
        out: "build-node",
      }
    : {
        fallback: "index.html",
        pages: "build-static",
        assets: "build-static",
      };

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(adapterConfig),
    csrf: {
      checkOrigin: false,
    },
    serviceWorker: {
      register: false,
    },
  },
};

export default config;
