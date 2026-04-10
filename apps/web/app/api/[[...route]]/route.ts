import { handle } from "hono/vercel";
import { createApiApp } from "@repo/api";
import { createE2eMockOpenMeteoFetch } from "@/lib/e2e-mock-open-meteo-fetch";

const app =
  process.env.E2E_MOCK_OPEN_METEO === "1"
    ? createApiApp(createE2eMockOpenMeteoFetch())
    : createApiApp();

export const revalidate = 300;

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
