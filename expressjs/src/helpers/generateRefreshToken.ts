import jwt from 'jsonwebtoken';
import { secret } from '@/config/secret';

export const generateRefreshToken = (refreshTokenEntry: any) => {
    return jwt.sign(
        { id: refreshTokenEntry.id },
        secret.refreshTokenSecret,
        { expiresIn: "365d" }
    );
};
