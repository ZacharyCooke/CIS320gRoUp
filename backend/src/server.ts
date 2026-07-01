import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";

const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`PetRecovery API listening on port ${env.PORT}`);
});
