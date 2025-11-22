import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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


