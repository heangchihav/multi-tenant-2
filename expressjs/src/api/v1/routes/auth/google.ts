import { type Request, type Response, Router } from 'express'
import passport from 'passport';
import { secret } from '@/config/secret';

const googleAuthRoutes: Router = Router();

// Redirect to Google for authentication
googleAuthRoutes.get('/google', passport.authenticate('google', { scope: ['openid', 'profile', 'email'], session: false }));

// Google auth callback
googleAuthRoutes.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        session: false
    }),
    (req: Request, res: Response) => {
        // Successful authentication
        const authInfo = req.authInfo as { accessToken?: string; refreshToken?: string };
        const accessToken = authInfo?.accessToken;
        const refreshToken = authInfo?.refreshToken;

        // For web clients, set the refresh token in a secure cookie
        if (refreshToken) {
            res.cookie("refreshToken", `Bearer ${refreshToken}`, {
                httpOnly: true,
                secure: secret.nodeEnv === 'production', // set to true if using https
                sameSite: "strict", // adjust according to your needs
            });
        }

        // For mobile clients, send the refresh token in the response body
        res.json({
            success: true,
            accessToken: `Bearer ${accessToken}`,
        });
    }
);

export default googleAuthRoutes;