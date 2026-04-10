import { afterAll, describe, expect, it, jest } from "@jest/globals";
import http from "node:http";
import { getRequestListener } from "@hono/node-server";
import request from "supertest";
import { createApiApp } from "./app.js";

describe("createApiApp", () => {
  const payload = {
    daily: {
      time: [
        "2026-04-10",
        "2026-04-11",
        "2026-04-12",
        "2026-04-13",
        "2026-04-14",
        "2026-04-15",
        "2026-04-16",
        "2026-04-17",
      ],
      weather_code: [0, 1, 2, 3, 45, 48, 51, 61],
      temperature_2m_max: [10, 11, 12, 13, 14, 15, 16, 17],
      temperature_2m_min: [0, 1, 2, 3, 4, 5, 6, 7],
      precipitation_sum: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  };

  const mockFetch = jest.fn(async () => {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;

  const app = createApiApp(mockFetch);
  const server = http.createServer(getRequestListener(app.fetch.bind(app)));

  afterAll((done) => {
    server.close(() => done());
  });

  it("GET /api returns JSON with Cache-Control", async () => {
    const res = await request(server).get("/api").expect(200);

    expect(res.headers["cache-control"]).toMatch(/s-maxage=300/);
    expect(res.body.days).toHaveLength(8);
    expect(res.body.location.name).toBe("Przemyśl");
  });

  it("returns 404 for unknown paths", async () => {
    await request(server).get("/api/unknown").expect(404);
  });
});
