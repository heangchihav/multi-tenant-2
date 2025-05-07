import { Router, Request, Response } from "express";
import { asyncErrorHandler } from "@/middlewares/error/ErrorMiddleware";
import { signup } from "../../controllers/auth/signup";
import { logout } from "../../controllers/auth/logout";
import { login } from "../../controllers/auth/login";
import { authCallBack, googleAuth } from "../../controllers/auth/google";

const authRoutes: Router = Router();

// Health check endpoint
authRoutes.get("/healthcheck", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});
// Mount routes
authRoutes.post('/signup', asyncErrorHandler(signup));
authRoutes.post('/login', asyncErrorHandler(login));
authRoutes.get('/logout', asyncErrorHandler(logout));

// Redirect to Google for authentication
authRoutes.get('/google',googleAuth)
// Google auth callback
authRoutes.get('/google/callback',authCallBack)

// Protected route example
authRoutes.post("/protected", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Access granted to protected route",
    user: req.user
  });
});

export default authRoutes;
