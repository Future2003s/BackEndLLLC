/**
 * Advanced Backend Performance Optimization
 * Comprehensive backend optimization utilities and middleware
 */

import { Request, Response, NextFunction } from "express";
import { performance } from "perf_hooks";
import { createHash, createHmac } from "crypto";
import { promisify } from "util";
import { gzip, gunzip } from "zlib";
import { LRU } from "lru-cache";

// Performance monitoring
export class BackendPerformanceMonitor {
    private static instance: BackendPerformanceMonitor;
    private metrics: Map<string, number[]> = new Map();
    private requestTimes: Map<string, number> = new Map();

    static getInstance(): BackendPerformanceMonitor {
        if (!BackendPerformanceMonitor.instance) {
            BackendPerformanceMonitor.instance = new BackendPerformanceMonitor();
        }
        return BackendPerformanceMonitor.instance;
    }

    // Start request timing
    startRequest(req: Request): void {
        const requestId = this.generateRequestId(req);
        this.requestTimes.set(requestId, performance.now());
    }

    // End request timing
    endRequest(req: Request, res: Response): void {
        const requestId = this.generateRequestId(req);
        const startTime = this.requestTimes.get(requestId);

        if (startTime) {
            const duration = performance.now() - startTime;
            this.recordMetric("request-duration", duration);
            this.recordMetric(`request-duration-${req.method}`, duration);
            this.recordMetric(`request-duration-${req.route?.path || req.path}`, duration);

            // Add performance headers
            res.set("X-Response-Time", `${duration.toFixed(2)}ms`);
            res.set("X-Performance-Metrics", JSON.stringify(this.getRequestMetrics(req)));

            this.requestTimes.delete(requestId);
        }
    }

    // Record metric
    recordMetric(name: string, value: number): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const values = this.metrics.get(name)!;
        values.push(value);

        // Keep only last 1000 measurements
        if (values.length > 1000) {
            values.shift();
        }
    }

    // Get metrics
    getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
        const result: Record<string, any> = {};

        for (const [name, values] of this.metrics.entries()) {
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const min = Math.min(...values);
                const max = Math.max(...values);

                result[name] = { avg, min, max, count: values.length };
            }
        }

        return result;
    }

    // Generate request ID
    private generateRequestId(req: Request): string {
        const ip = req.ip || req.connection.remoteAddress || "unknown";
        const userAgent = req.get("User-Agent") || "unknown";
        const timestamp = Date.now();

        return createHash("md5").update(`${ip}-${userAgent}-${timestamp}`).digest("hex");
    }

    // Get request metrics
    private getRequestMetrics(req: Request): Record<string, any> {
        return {
            method: req.method,
            path: req.path,
            query: req.query,
            headers: req.headers,
            timestamp: new Date().toISOString()
        };
    }
}

// Advanced caching system
export class AdvancedCache {
    private static instance: AdvancedCache;
    private memoryCache: LRU<string, any>;
    private redisCache: any; // Redis client
    private compressionEnabled: boolean = true;

    constructor() {
        this.memoryCache = new LRU({
            max: 1000,
            ttl: 1000 * 60 * 5, // 5 minutes
            updateAgeOnGet: true,
            updateAgeOnHas: true
        });
    }

    static getInstance(): AdvancedCache {
        if (!AdvancedCache.instance) {
            AdvancedCache.instance = new AdvancedCache();
        }
        return AdvancedCache.instance;
    }

    // Set cache with compression
    async set(key: string, value: any, ttl: number = 300): Promise<void> {
        try {
            let serializedValue = JSON.stringify(value);

            // Compress if enabled
            if (this.compressionEnabled && serializedValue.length > 1024) {
                serializedValue = await this.compress(serializedValue);
            }

            // Store in memory cache
            this.memoryCache.set(key, serializedValue, { ttl: ttl * 1000 });

            // Store in Redis if available
            if (this.redisCache) {
                await this.redisCache.setex(key, ttl, serializedValue);
            }
        } catch (error) {
            console.error("Cache set error:", error);
        }
    }

    // Get cache with decompression
    async get<T>(key: string): Promise<T | null> {
        try {
            // Try memory cache first
            let value = this.memoryCache.get(key);

            if (!value && this.redisCache) {
                // Try Redis cache
                value = await this.redisCache.get(key);
                if (value) {
                    // Store in memory cache for faster access
                    this.memoryCache.set(key, value);
                }
            }

            if (!value) return null;

            // Decompress if needed
            if (this.compressionEnabled && typeof value === "string" && value.startsWith("gzip:")) {
                value = await this.decompress(value.substring(5));
            }

            return JSON.parse(value);
        } catch (error) {
            console.error("Cache get error:", error);
            return null;
        }
    }

    // Delete cache
    async delete(key: string): Promise<void> {
        this.memoryCache.delete(key);
        if (this.redisCache) {
            await this.redisCache.del(key);
        }
    }

    // Clear all cache
    async clear(): Promise<void> {
        this.memoryCache.clear();
        if (this.redisCache) {
            await this.redisCache.flushdb();
        }
    }

    // Compress data
    private async compress(data: string): Promise<string> {
        const gzipAsync = promisify(gzip);
        const compressed = await gzipAsync(data);
        return "gzip:" + compressed.toString("base64");
    }

    // Decompress data
    private async decompress(data: string): Promise<string> {
        const gunzipAsync = promisify(gunzip);
        const buffer = Buffer.from(data, "base64");
        const decompressed = await gunzipAsync(buffer);
        return decompressed.toString();
    }

    // Set Redis client
    setRedisClient(redisClient: any): void {
        this.redisCache = redisClient;
    }
}

// Request optimization middleware
export class RequestOptimizer {
    private static instance: RequestOptimizer;
    private requestCache: Map<string, any> = new Map();
    private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();

    static getInstance(): RequestOptimizer {
        if (!RequestOptimizer.instance) {
            RequestOptimizer.instance = new RequestOptimizer();
        }
        return RequestOptimizer.instance;
    }

    // Request deduplication middleware
    requestDeduplication(req: Request, res: Response, next: NextFunction): void {
        const requestKey = this.generateRequestKey(req);
        const cached = this.requestCache.get(requestKey);

        if (cached && Date.now() - cached.timestamp < 1000) {
            // 1 second deduplication
            res.json(cached.response);
            return;
        }

        // Store original methods
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.json = (body: any) => {
            this.requestCache.set(requestKey, {
                response: body,
                timestamp: Date.now()
            });
            return originalJson(body);
        };

        res.send = (body: any) => {
            this.requestCache.set(requestKey, {
                response: body,
                timestamp: Date.now()
            });
            return originalSend(body);
        };

        next();
    }

    // Rate limiting middleware
    rateLimiting(
        options: {
            windowMs?: number;
            maxRequests?: number;
            keyGenerator?: (req: Request) => string;
        } = {}
    ): (req: Request, res: Response, next: NextFunction) => void {
        const { windowMs = 60000, maxRequests = 100, keyGenerator } = options;

        return (req: Request, res: Response, next: NextFunction) => {
            const key = keyGenerator ? keyGenerator(req) : req.ip || "unknown";
            const now = Date.now();
            const limit = this.rateLimiter.get(key);

            if (!limit || now > limit.resetTime) {
                this.rateLimiter.set(key, {
                    count: 1,
                    resetTime: now + windowMs
                });
                next();
                return;
            }

            if (limit.count >= maxRequests) {
                res.status(429).json({
                    error: "Too Many Requests",
                    message: "Rate limit exceeded",
                    retryAfter: Math.ceil((limit.resetTime - now) / 1000)
                });
                return;
            }

            limit.count++;
            next();
        };
    }

    // Request compression middleware
    compression(req: Request, res: Response, next: NextFunction): void {
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.json = (body: any) => {
            const jsonString = JSON.stringify(body);

            if (jsonString.length > 1024) {
                res.set("Content-Encoding", "gzip");
                res.set("Content-Type", "application/json");

                gzip(jsonString, (err, compressed) => {
                    if (err) {
                        originalJson(body);
                    } else {
                        res.send(compressed);
                    }
                });
            } else {
                originalJson(body);
            }
        };

        res.send = (body: any) => {
            if (typeof body === "string" && body.length > 1024) {
                res.set("Content-Encoding", "gzip");

                gzip(body, (err, compressed) => {
                    if (err) {
                        originalSend(body);
                    } else {
                        res.send(compressed);
                    }
                });
            } else {
                originalSend(body);
            }
        };

        next();
    }

    // Generate request key
    private generateRequestKey(req: Request): string {
        const method = req.method;
        const path = req.path;
        const query = JSON.stringify(req.query);
        const body = JSON.stringify(req.body);

        return createHash("md5").update(`${method}:${path}:${query}:${body}`).digest("hex");
    }
}

// Database optimization utilities
export class DatabaseOptimizer {
    private static instance: DatabaseOptimizer;
    private queryCache: Map<string, any> = new Map();
    private connectionPool: any;

    static getInstance(): DatabaseOptimizer {
        if (!DatabaseOptimizer.instance) {
            DatabaseOptimizer.instance = new DatabaseOptimizer();
        }
        return DatabaseOptimizer.instance;
    }

    // Optimized query execution
    async executeQuery<T>(
        query: string,
        params: any[] = [],
        options: {
            cache?: boolean;
            ttl?: number;
            timeout?: number;
        } = {}
    ): Promise<T> {
        const { cache = true, ttl = 300, timeout = 5000 } = options;
        const queryKey = this.generateQueryKey(query, params);

        // Check cache first
        if (cache) {
            const cached = this.queryCache.get(queryKey);
            if (cached && Date.now() - cached.timestamp < ttl * 1000) {
                return cached.result;
            }
        }

        // Execute query with timeout
        const startTime = performance.now();

        try {
            const result = await Promise.race([
                this.executeQueryInternal(query, params),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout")), timeout))
            ]);

            const duration = performance.now() - startTime;

            // Cache result
            if (cache) {
                this.queryCache.set(queryKey, {
                    result,
                    timestamp: Date.now()
                });
            }

            // Record performance metrics
            const monitor = BackendPerformanceMonitor.getInstance();
            monitor.recordMetric("query-duration", duration);
            monitor.recordMetric(`query-duration-${query.substring(0, 20)}`, duration);

            return result as T;
        } catch (error) {
            console.error("Query execution error:", error);
            throw error;
        }
    }

    // Batch query execution
    async executeBatchQueries<T>(
        queries: Array<{ query: string; params: any[] }>,
        options: {
            parallel?: boolean;
            batchSize?: number;
        } = {}
    ): Promise<T[]> {
        const { parallel = true, batchSize = 10 } = options;

        if (parallel) {
            // Execute queries in parallel
            const promises = queries.map(({ query, params }) => this.executeQuery<T>(query, params));
            return Promise.all(promises);
        } else {
            // Execute queries in batches
            const results: T[] = [];

            for (let i = 0; i < queries.length; i += batchSize) {
                const batch = queries.slice(i, i + batchSize);
                const batchPromises = batch.map(({ query, params }) => this.executeQuery<T>(query, params));
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            }

            return results;
        }
    }

    // Connection pooling
    async getConnection(): Promise<any> {
        if (!this.connectionPool) {
            throw new Error("Connection pool not initialized");
        }

        return this.connectionPool.getConnection();
    }

    // Set connection pool
    setConnectionPool(pool: any): void {
        this.connectionPool = pool;
    }

    // Generate query key
    private generateQueryKey(query: string, params: any[]): string {
        return createHash("md5")
            .update(`${query}:${JSON.stringify(params)}`)
            .digest("hex");
    }

    // Execute query internally
    private async executeQueryInternal(query: string, params: any[]): Promise<any> {
        // This would be implemented based on your database driver
        // For example, with MySQL:
        // const connection = await this.getConnection();
        // const [rows] = await connection.execute(query, params);
        // connection.release();
        // return rows;

        throw new Error("Query execution not implemented");
    }
}

// Export singleton instances
export const performanceMonitor = BackendPerformanceMonitor.getInstance();
export const advancedCache = AdvancedCache.getInstance();
export const requestOptimizer = RequestOptimizer.getInstance();
export const databaseOptimizer = DatabaseOptimizer.getInstance();

// Middleware functions
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    performanceMonitor.startRequest(req);
    res.on("finish", () => {
        performanceMonitor.endRequest(req, res);
    });
    next();
};

export const cacheMiddleware = (ttl: number = 300) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const cacheKey = `request:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
        const cached = await advancedCache.get(cacheKey);

        if (cached) {
            res.json(cached);
            return;
        }

        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            advancedCache.set(cacheKey, body, ttl);
            return originalJson(body);
        };

        next();
    };
};

export const compressionMiddleware = (req: Request, res: Response, next: NextFunction) => {
    requestOptimizer.compression(req, res, next);
};

export const deduplicationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    requestOptimizer.requestDeduplication(req, res, next);
};

export const rateLimitMiddleware = (options: any) => {
    return requestOptimizer.rateLimiting(options);
};
