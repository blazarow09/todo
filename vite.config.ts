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
    emptyOutDir: false, // Don't clean dist directory to avoid conflicts with electron-builder
  },
});


