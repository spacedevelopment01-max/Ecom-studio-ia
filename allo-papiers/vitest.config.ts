import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    globalSetup: ["tests/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      APP_URL: "http://localhost:3100",
      DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:54340/allopapiers",
      SESSION_SECRET: "test-session-secret-0123456789abcdef",
      FILE_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      CRON_SECRET: "test-cron",
      STRIPE_SECRET_KEY: "sk_test_fake_for_signature_tests",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
      STRIPE_PRICE_PLUS: "price_test_plus",
      LAPOSTE_MODE: "test",
    },
  },
});
