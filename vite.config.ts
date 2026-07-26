// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// mcpPlugin() (@lovable.dev/mcp-js) desativado temporariamente: ele compara
// caminhos com barra "/" contra o cwd nativo do Windows ("D:\...\src\routes"),
// e falha o build inteiro com "routesDir must resolve under ...". Os arquivos
// que o Lovable gerou em src/lib/mcp/ e .lovable/mcp/ continuam intactos.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
