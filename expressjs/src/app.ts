import express, { Express, Response, Request, NextFunction } from 'express';
import path from 'path';
import * as expressWinston from 'express-winston';
import Logger from '@/config/logger';
import v1Router from '@/api/v1/routes';
import {
    configureBasicMiddlewares,
    configureLoggingMiddlewares,
    configureSecurityMiddlewares,
    configureErrorHandling,
    configureAuthMiddlewares,
    configurePerformanceMiddlewares
} from './middlewares';
import { ServeStaticOptions } from 'serve-static';
import { ServerResponse } from 'http';

// Initialize authentication strategies
import './libs/authStrategies/jwtStrategy';
import './libs/authStrategies/googleStrategy';
import { secret } from './config/secret';

/**
 * Express application setup with security-first middleware configuration
 */
class App {
    private readonly _app: Express;

    constructor() {
        this._app = express();
        this.configureMiddlewares();
    }

    /**
     * Get the configured Express application instance
     */
    public get app(): Express {
        return this._app;
    }

    /**
     * Configure application middleware in the correct order
     * Order is important for security and functionality
     * 
     * 1. Health checks (no middleware)
     * 2. Basic middleware (compression, cookies, cors)
     * 3. Logging middleware
     * 4. Security middleware
     * 5. Authentication middleware
     * 6. Static files
     * 7. Routes
     * 8. Error handling
     */
    private configureMiddlewares(): void {
        // Health check endpoints (before any middleware)
        this.configureHealthChecks();

        // Parse JSON request bodies
        this._app.use(express.json());
        this._app.use(express.urlencoded({ extended: true }));

        this._app.set("trust proxy", 1);  // Trust first proxy (safest option)

        // Performance middlewares
        configurePerformanceMiddlewares(this._app);

        // Basic middlewares (cookies, cors)
        configureBasicMiddlewares(this._app);

        // Logging (before security to log all requests)
        configureLoggingMiddlewares(this._app);

        // Winston error logging
        this.configureWinstonErrorLogging();

        // Security middlewares (after logging, before routes)
        configureSecurityMiddlewares(this._app);

        // Authentication middlewares
        configureAuthMiddlewares(this._app);

        // Static files (after security checks)
        this.configureStaticFiles();

        // API routes
        this.configureRoutes();

        // Error handling (must be last)
        configureErrorHandling(this._app);
    }

    /**
     * Configure health check endpoints
     * These endpoints should be accessible without any middleware
     */
    private configureHealthChecks(): void {
        this._app.get('/healthcheck', (_req: Request, res: Response) => {
            res.status(200).json({ status: 'healthy' });
        });
    }

    /**
     * Configure Winston error logging
     */
    private configureWinstonErrorLogging(): void {
        this._app.use(expressWinston.errorLogger({
            winstonInstance: Logger,
            msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
            meta: true,
            requestWhitelist: secret.nodeEnv === 'production'
                ? ['url', 'method', 'httpVersion', 'originalUrl', 'query']
                : ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query', 'body']
        }));
    }

    /**
     * Configure static file serving
     */
    private configureStaticFiles(): void {
        const options: ServeStaticOptions = {
            dotfiles: 'ignore',
            etag: true,
            maxAge: '1d',
            redirect: false,
            setHeaders: (res: ServerResponse) => {
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('X-Frame-Options', 'DENY');
                res.setHeader('X-XSS-Protection', '1; mode=block');
            }
        };

        // Ensure public directory exists
        const publicPath = path.join(__dirname, '../public');
        this._app.use(express.static(publicPath, options));
    }

    /**
     * Configure API routes
     */
    private configureRoutes(): void {
        this._app.use('/api/v1', v1Router);
        this._app.use('/', (_req: Request, res: Response) => { res.status(404).json({ message: 'Hello word' }); });
    }
}

// Create and export a single instance of the application
const app = new App().app;
export default app;
