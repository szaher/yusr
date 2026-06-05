const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LEVELS: Record<string, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? 2;

export const logger = {
  error(data: Record<string, unknown>, msg: string) {
    if (currentLevel >= 0)
      console.error(
        JSON.stringify({ level: "error", msg, ...data, ts: new Date().toISOString() })
      );
  },
  warn(data: Record<string, unknown>, msg: string) {
    if (currentLevel >= 1)
      console.warn(
        JSON.stringify({ level: "warn", msg, ...data, ts: new Date().toISOString() })
      );
  },
  info(data: Record<string, unknown>, msg: string) {
    if (currentLevel >= 2)
      console.info(
        JSON.stringify({ level: "info", msg, ...data, ts: new Date().toISOString() })
      );
  },
  debug(data: Record<string, unknown>, msg: string) {
    if (currentLevel >= 3)
      console.debug(
        JSON.stringify({ level: "debug", msg, ...data, ts: new Date().toISOString() })
      );
  },
};
