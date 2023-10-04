import { defineConfig } from 'tsup'

export default defineConfig({
    splitting: false,
    clean: true,
    dts: true,
    format: ["esm", "cjs"],
    legacyOutput: true,
    outDir: "build"
})