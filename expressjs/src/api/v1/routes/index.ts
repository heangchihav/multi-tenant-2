import { Router } from "express";
import cloudflareRoutes from "./cloudflare";
import domainRoutes from "./domain";
import authRoutes from "./auth";
import templatesRoutes from "./template";

const v1Router: Router = Router();

// auth routes
v1Router.use("/auth",authRoutes);

// set up domain routes
v1Router.use("/domain",domainRoutes );

// set up cloudflare
v1Router.use("/cloudflare",cloudflareRoutes)
v1Router.use("/template",templatesRoutes)

export default v1Router;
