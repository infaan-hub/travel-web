import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  errors?: unknown;

  constructor(status: number, message: string, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function apiError(
  status: number,
  message: string,
  errors?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(errors ? { errors } : {}),
    },
    { status },
  );
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data as never, { status });
}

export function fieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "non_field_errors";
    out[key] = out[key] || [];
    out[key].push(issue.message);
  }
  return out;
}

function prismaMessage(error: Prisma.PrismaClientKnownRequestError): string {
  switch (error.code) {
    case "P2002":
      return "A record with these unique values already exists.";
    case "P2003":
      return "A referenced record does not exist.";
    case "P2025":
      return "Record not found.";
    default:
      return "Database operation failed.";
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return apiError(error.status, error.message, error.errors);
  }
  if (error instanceof ZodError) {
    const errors = fieldErrors(error);
    const first = Object.values(errors)[0]?.[0] || "Validation failed";
    return apiError(400, first, errors);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status =
      error.code === "P2025" ? 404 : error.code === "P2002" || error.code === "P2003" ? 400 : 500;
    return apiError(status, prismaMessage(error), { code: error.code });
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Database connection failed", error.message);
    return apiError(503, "Database is unavailable.");
  }
  if (error instanceof SyntaxError) {
    return apiError(400, "Invalid JSON body.");
  }
  console.error("Unhandled API error", error);
  return apiError(500, "An unexpected server error occurred.");
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }
}

export function parseId(value: string | undefined, label = "id"): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(404, `Invalid ${label}.`);
  }
  return id;
}
