import "server-only";

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
  return LEVELS[configured] ?? LEVELS.info;
}

export type LogContext = Record<string, unknown> & { requestId?: string };

function emit(level: Level, message: string, context?: LogContext): void {
  if (LEVELS[level] < threshold()) return;
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ?? {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};

/** Central error reporter used by API handlers and the error boundary. */
export function reportError(error: unknown, context?: LogContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(message, { ...(context ?? {}), stack });
}

export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
