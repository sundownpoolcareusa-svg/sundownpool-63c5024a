import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    viteReact(),
    nitro({
      preset: "vercel",
      routeRules: {
        "/sitemap.xml": { headers: { "content-type": "application/xml; charset=utf-8" } },
        "/robots.txt": { headers: { "content-type": "text/plain; charset=utf-8" } },
      },
    }),
  ],
});
