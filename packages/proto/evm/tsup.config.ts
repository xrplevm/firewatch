import { defineConfig } from "@shared/tsup";

export default defineConfig({
    dts: true,
    entry: ["src/index.ts", "src/query.client.ts"],
    format: ["cjs", "esm"],
    outDir: "dist",
});
