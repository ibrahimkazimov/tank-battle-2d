import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    watch: {
      // Watch the shared package for changes
      ignored: ["!**/node_modules/@tank-battle/**"],
    },
  },
  optimizeDeps: {
    // Don't pre-bundle the shared package so changes are picked up
    exclude: ["@tank-battle/shared"],
  },
});
