import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testy čisté logiky (import, čas, barvy) – bez prohlížeče a bez databáze.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
