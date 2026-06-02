import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  build: {
    outDir: 'dist', // Tells Vite to use 'dist' instead of '.output'
  },
});