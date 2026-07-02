import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocketServer } from "./integrations/websocket.server.js";

const server = createServer(app);
initSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`PetRecovery API listening on port ${env.PORT}`);
});
