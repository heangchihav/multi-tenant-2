import { z } from 'zod'

export const SignUpSchema = z.object({
    username: z.string()
        .min(3, { message: 'Username must be at least 3 characters long' })
        .max(50, { message: 'Username cannot exceed 50 characters' })
        .regex(/^[a-zA-Z0-9_]+$/, { 
            message: 'Username can only contain letters, numbers, and underscores' 
        }),
    password: z.string()
        .min(8, { message: 'Password must be at least 8 characters long' })
        .max(100, { message: 'Password cannot exceed 100 characters' })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }),
    isMobile: z.boolean().optional().default(false),
    deviceInfo: z.object({
        deviceType: z.string().optional(),
        platform: z.string().optional(),
        browser: z.string().optional()
    }).optional()
});