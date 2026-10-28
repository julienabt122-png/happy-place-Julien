// Configuration Vite standard (remplace @lovable.dev/vite-tanstack-config).
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    port: 3000,
    // Autorise l'aperçu dans GitHub Codespaces (adresses en *.app.github.dev)
    allowedHosts: [".app.github.dev"],
  },
  resolve: { dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"] },
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      // Point d'entrée serveur : src/server.ts (page d'erreur propre en cas de plantage)
      server: { entry: "server" },
    }),
    // Hébergement Cloudflare Workers : Nitro génère le wrangler.json au build
    nitro({
      preset: "cloudflare_module",
      compatibilityDate: "2025-04-01",
      cloudflare: {
        deployConfig: true,
        nodeCompat: true,
        // Nom fixe : doit correspondre au Worker relié à GitHub (Workers Builds)
        wrangler: { name: "happy-place-julien", previews: {} },
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
});
