// Droplet build: same console, Node server output (run by PM2 behind Nginx).
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(), tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    react(), nitro({ preset: "node-server" }),
  ],
});
