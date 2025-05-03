import * as jwt from 'jsonwebtoken';
import { secret } from '@/config/secret';

export const generateAccessToken = (userId: number) => {
    return jwt.sign(
        { userId }, // ID will be automatically converted to string in JWT
        secret.accessTokenSecret,
        { expiresIn: "1m" }
    );
};
