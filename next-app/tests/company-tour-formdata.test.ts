import type { InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it } from "vitest";
import { api, companyAPI } from "@/lib/api/client";

const originalAdapter = api.defaults.adapter;
let lastRequest: InternalAxiosRequestConfig | undefined;

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  lastRequest = undefined;
});

describe("company tour form-data transport", () => {
  it("preserves multipart data and removes the inherited JSON content type", async () => {
    api.defaults.adapter = async (config) => {
      lastRequest = config;
      return {
        data: { id: 42 },
        status: 201,
        statusText: "Created",
        headers: {},
        config,
      };
    };

    const form = new FormData();
    form.append("title", "Stone Town walk");
    form.append("image", new File(["cover"], "cover.jpg", { type: "image/jpeg" }));

    const response = await companyAPI.createTour(form);

    expect(response.data).toEqual({ id: 42 });
    expect(lastRequest?.data).toBe(form);
    expect(lastRequest?.headers.get("Content-Type")).toBe(false);
  });
});