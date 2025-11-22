import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";

const packageJson = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8"));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  base: "./",
  build: {
    emptyOutDir: true, // Safe now that electron-builder outputs to release/
    // Production optimizations
    minify: "esbuild", // Faster than terser
    sourcemap: false, // Disable sourcemaps for faster builds
    rollupOptions: {
      output: {
        manualChunks: undefined, // Let Vite handle chunking automatically
      },
    },
    // Increase chunk size warning limit to reduce warnings
    chunkSizeWarningLimit: 1000,
  },
});


