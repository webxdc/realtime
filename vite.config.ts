import { mockWebxdc } from "@webxdc/vite-plugins";
import dts from "vite-plugin-dts";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [dts({ tsconfigPath: "./tsconfig-build.json" }), mockWebxdc()],
  build: {
    lib: {
      entry: resolve(__dirname, "lib/realtime.ts"),
      fileName: "realtime",
      formats: ["es"],
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {},
      },
    },
  },
});
