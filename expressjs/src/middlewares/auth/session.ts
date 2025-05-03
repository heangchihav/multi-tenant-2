import session from "express-session";
import { RequestHandler } from "express";
import { secret } from "@/config/secret";

export const sessionMiddleware: RequestHandler = session({
    secret: secret.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: secret.nodeEnv === 'production', httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: "strict" } // 24 hours
});