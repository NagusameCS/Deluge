import { defineConfig } from "vite";

// Use relative base so assets load correctly when served from GitHub Pages subpaths
export default defineConfig({
    base: "./",
    build: {
        outDir: "docs",
    },
});
