import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/route/calculate/route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/route/calculate/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const STONE_TOWN = {
  origin_lat: -6.161013,
  origin_lng: 39.191056,
  destination_lat: -5.731197,
  destination_lng: 39.292716,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/route/calculate", () => {
  it("returns OSRM road geometry with km, minutes and lat/lng order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            distance: 56_360,
            duration: 3_960,
            geometry: {
              coordinates: [
                [39.191_87, -6.160_16],
                [39.24, -5.95],
                [39.292_69, -5.731_27],
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(STONE_TOWN));
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      distance_km: 56.36,
      estimated_time_mins: 66,
      duration_mins: 66,
      source: "osrm",
      origin: { lat: STONE_TOWN.origin_lat, lng: STONE_TOWN.origin_lng },
      destination: {
        lat: STONE_TOWN.destination_lat,
        lng: STONE_TOWN.destination_lng,
      },
    });
    // OSRM is queried with lng,lat; the API always responds with lat,lng.
    expect(payload.geometry).toEqual([
      [-6.16016, 39.19187],
      [-5.95, 39.24],
      [-5.73127, 39.29269],
    ]);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe(
      "/route/v1/driving/39.191056,-6.161013;39.292716,-5.731197",
    );
    expect(url.searchParams.get("overview")).toBe("full");
    expect(url.searchParams.get("geometries")).toBe("geojson");
  });

  it("falls back to a labelled straight-line estimate when OSRM fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("routing service unavailable")),
    );

    const response = await POST(request(STONE_TOWN));
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.source).toBe("estimate");
    expect(payload.distance_km).toBeGreaterThan(40);
    expect(payload.distance_km).toBeLessThan(80);
    expect(payload.estimated_time_mins).toBeGreaterThan(0);
    // The fallback keeps the request endpoints but rounds them for the wire.
    expect(payload.geometry).toEqual([
      [-6.16101, 39.19106],
      [-5.7312, 39.29272],
    ]);
  });

  it("rejects coordinates outside the valid range", async () => {
    const response = await POST(
      request({ ...STONE_TOWN, destination_lat: 120 }),
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.success).toBe(false);
  });
});
