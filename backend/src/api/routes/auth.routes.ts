import { Router } from "express";
import { authFacebookRouter } from "./auth/auth-facebook.routes.js";
import { authPasswordResetRouter } from "./auth/auth-password-reset.routes.js";
import { authProfileRouter } from "./auth/auth-profile.routes.js";
import { authRegistrationRouter } from "./auth/auth-registration.routes.js";
import { authSessionRouter } from "./auth/auth-session.routes.js";

export const authRouter = Router();

authRouter.use("/", authRegistrationRouter);
authRouter.use("/", authSessionRouter);
authRouter.use("/", authProfileRouter);
authRouter.use("/", authFacebookRouter);
authRouter.use("/", authPasswordResetRouter);
