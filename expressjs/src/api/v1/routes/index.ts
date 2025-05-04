import { Router } from "express";
import authRoutes from "@/api/v1/routes/auth";
import domainRoutes from "@/api/v1/routes/domain";
import createClientRoutes from "@/api/v1/routes/createclient/createclient";

const v1Router: Router = Router();

v1Router.use("/auth", authRoutes);
v1Router.use("/domain", domainRoutes);
v1Router.use("/client",createClientRoutes)
export default v1Router;
