import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@meridian/domain": path.resolve(__dirname, "../domain/src/index.ts"),
    },
  },
  test: {
    globals: false,
  },
});
