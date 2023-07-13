/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import {
  pageCache,
  imageCache,
  staticResourceCache,
  googleFontsCache,
} from "workbox-recipes";

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();