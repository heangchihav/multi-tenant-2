import { Router, Request, Response } from "express";
import logoutRoutes from "@/api/v1/routes/auth/logout";
import googleAuthRoutes from "@/api/v1/routes/auth/google";
import signupRoutes from "@/api/v1/routes/auth/sign-up";
import loginRoutes from "@/api/v1/routes/auth/login";

const authRoutes: Router = Router();

// Health check endpoint
authRoutes.get("/healthcheck", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});
// Mount routes
authRoutes.use(signupRoutes);
authRoutes.use(loginRoutes);
authRoutes.use(logoutRoutes);
authRoutes.use(googleAuthRoutes)
// Protected route example
authRoutes.post("/protected", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Access granted to protected route",
    user: req.user
  });
});

export default authRoutes;
