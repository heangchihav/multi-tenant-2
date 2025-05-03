import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { PrismaClient, User, Role } from "@prisma/client";
import { secret } from "@/config/secret";
import Logger from "@/config/logger";

const prisma = new PrismaClient();

// Google OAuth Strategy configuration
passport.use(
    new GoogleStrategy(
        {
            clientID: secret.googleClientId || "",
            clientSecret: secret.googleClientSecret || "",
            callbackURL: secret.callbackUrl,
            scope: ["profile", "email"],
        },
        async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
            try {
                const email = profile.emails?.[0]?.value || "";
                const googleId = profile.id;
                const displayName = profile.displayName;

                // 🔹 Check if user already exists (by email OR Google ID)
                let user = await prisma.user.findFirst({
                    where: {
                        OR: [{ email }, { googleId }],
                    },
                    include: { merchant: true }, // Fetch merchant details
                });

                if (user) {
                    // 🔹 If user exists but has no Google ID, update it
                    if (!user.googleId) {
                        user = await prisma.user.update({
                            where: { id: user.id },
                            data: { googleId },
                            include: { merchant: true }, // Ensure merchant is included
                        });
                    }
                    return done(null, user);
                }

                // 🔹 If user does not exist, create a new merchant
                const merchant = await prisma.merchant.create({
                    data: { name: `Merchant-${displayName}` },
                });

                // 🔹 Create a new user associated with the new merchant
                const newUser = await prisma.user.create({
                    data: {
                        merchantId: merchant.id,
                        email,
                        googleId,
                        name: displayName,
                        role: Role.USER,
                    },
                });

                // 🔹 Refetch the user to include merchant details
                user = await prisma.user.findUnique({
                    where: { id: newUser.id },
                    include: { merchant: true },
                });

                if (!user) {
                    return done(null, false); // ✅ FIX: Ensure user is never null
                }

                return done(null, user);
            } catch (error) {
                Logger.error("Error in Google authentication:", error);
                return done(error as Error, false);
            }
        }
    )
);

// Serialize user for the session
passport.serializeUser((user: any, done) => {
    const typedUser = user as User;
    Logger.debug("Serializing user", { userId: typedUser.id });
    done(null, typedUser.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: number, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: { merchant: true }, // Fetch merchant details
        });

        if (!user) {
            Logger.warn("Deserialized user not found", { userId: id });
            return done(null, false); // ✅ FIX: Return `false` instead of `null`
        }

        Logger.debug("Deserialized user found", { userId: user.id });
        return done(null, user);
    } catch (error) {
        Logger.error("Error deserializing user", { error });
        return done(error as Error, false);
    }
});
