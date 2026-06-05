import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .min(1, "AUTH_SECRET is required")
    .refine(
      (val) =>
        process.env.NODE_ENV !== "production" || !val.includes("dev-secret"),
      "AUTH_SECRET must not contain 'dev-secret' in production"
    ),
  NEXT_PUBLIC_VAPID_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
});

let validated = false;

export function validateEnv() {
  if (validated) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  validated = true;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      `Invalid environment variables: ${parsed.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  if (
    (parsed.data.NEXT_PUBLIC_VAPID_KEY && !parsed.data.VAPID_PRIVATE_KEY) ||
    (!parsed.data.NEXT_PUBLIC_VAPID_KEY && parsed.data.VAPID_PRIVATE_KEY)
  ) {
    throw new Error(
      "Both NEXT_PUBLIC_VAPID_KEY and VAPID_PRIVATE_KEY must be set together"
    );
  }
}
