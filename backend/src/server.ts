import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocketServer } from "./integrations/websocket.server.js";
import { closeDatabase } from "./config/database.js";
import { closeRedis } from "./config/redis.js";

const server = createServer(app);
initSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`PetRecovery API listening on port ${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await Promise.allSettled([closeDatabase(), closeRedis()]);
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
