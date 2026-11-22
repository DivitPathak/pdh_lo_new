import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  test: {
    pool: "threads",
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["src/lib/**/*.{test,spec}.ts"],
        },
        resolve: { alias },
      },
      {
        plugins: [react()],
        test: {
          name: "ui",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/{components,routes,test}/**/*.{test,spec}.{ts,tsx}"],
        },
        resolve: { alias },
      },
    ],
  },
});
