/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The built app is served by FastAPI under /lab (option a).
// In development, Vite forwards API and WebSocket calls to the FastAPI server on 8765.
export default defineConfig({
  base: "/lab/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8765",
      "/ws": { target: "ws://127.0.0.1:8765", ws: true },
    },
  },
  test: { environment: "node" },
});
