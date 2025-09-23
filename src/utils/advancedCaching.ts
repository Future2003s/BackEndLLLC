/**
 * Comprehensive Caching Strategy
 * Multi-layer caching system for optimal performance
 */

import { performance } from "perf_hooks";
import { createHash, createHmac } from "crypto";
import { LRU } from "lru-cache";

// Cache layer types
export enum CacheLayer {
    MEMORY = "memory",
    REDIS = "redis",
    DATABASE = "database",
    CDN = "cdn"
}

// Cache entry interface
export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    layer: CacheLayer;
    tags: string[];
    version: number;
    compressed?: boolean;
}

// Cache configuration
export interface CacheConfig {
    defaultTtl: number;
    maxMemorySize: number;
    compressionThreshold: number;
    enableCompression: boolean;
    enableEncryption: boolean;
    encryptionKey?: string;
}

// Multi-layer cache implementation
export class MultiLayerCache {
    private static instance: MultiLayerCache;
    private memoryCache: LRU<string, CacheEntry>;
    private redisCache: any; // Redis client
    private databaseCache: any; // Database cache
    private cdnCache: any; // CDN cache
    private config: CacheConfig;
    private metrics: Map<string, any> = new Map();

    constructor(config: CacheConfig) {
        this.config = config;
        this.memoryCache = new LRU({
            max: config.maxMemorySize,
            ttl: config.defaultTtl * 1000,
            updateAgeOnGet: true,
            updateAgeOnHas: true
        });
    }

    static getInstance(config?: CacheConfig): MultiLayerCache {
        if (!MultiLayerCache.instance) {
            if (!config) {
                throw new Error("Cache config required for first initialization");
            }
            MultiLayerCache.instance = new MultiLayerCache(config);
        }
        return MultiLayerCache.instance;
    }

    // Set cache entry
    async set<T>(
        key: string,
        data: T,
        options: {
            ttl?: number;
            layer?: CacheLayer;
            tags?: string[];
            version?: number;
            compress?: boolean;
            encrypt?: boolean;
        } = {}
    ): Promise<void> {
        const {
            ttl = this.config.defaultTtl,
            layer = CacheLayer.MEMORY,
            tags = [],
            version = 1,
            compress = false,
            encrypt = false
        } = options;

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl * 1000,
            layer,
            tags,
            version,
            compressed: compress
        };

        // Compress if enabled and threshold met
        if (compress && this.config.enableCompression) {
            const serialized = JSON.stringify(data);
            if (serialized.length > this.config.compressionThreshold) {
                entry.data = (await this.compress(serialized)) as T;
                entry.compressed = true;
            }
        }

        // Encrypt if enabled
        if (encrypt && this.config.enableEncryption) {
            entry.data = (await this.encrypt(JSON.stringify(data))) as T;
        }

        // Store in appropriate layer
        switch (layer) {
            case CacheLayer.MEMORY:
                this.memoryCache.set(key, entry);
                break;
            case CacheLayer.REDIS:
                if (this.redisCache) {
                    await this.redisCache.setex(key, ttl, JSON.stringify(entry));
                }
                break;
            case CacheLayer.DATABASE:
                if (this.databaseCache) {
                    await this.databaseCache.set(key, entry, ttl);
                }
                break;
            case CacheLayer.CDN:
                if (this.cdnCache) {
                    await this.cdnCache.set(key, entry, ttl);
                }
                break;
        }

        // Record metrics
        this.recordMetric("cache-set", 1);
        this.recordMetric(`cache-set-${layer}`, 1);
    }

    // Get cache entry
    async get<T>(key: string, layer?: CacheLayer): Promise<T | null> {
        const startTime = performance.now();

        try {
            let entry: CacheEntry<T> | null = null;

            // Try specified layer first, then fallback to all layers
            if (layer) {
                entry = await this.getFromLayer(key, layer);
            } else {
                // Try layers in order of speed
                const layers = [CacheLayer.MEMORY, CacheLayer.REDIS, CacheLayer.DATABASE, CacheLayer.CDN];

                for (const currentLayer of layers) {
                    entry = await this.getFromLayer(key, currentLayer);
                    if (entry) break;
                }
            }

            if (!entry) {
                this.recordMetric("cache-miss", 1);
                return null;
            }

            // Check TTL
            if (Date.now() - entry.timestamp > entry.ttl) {
                await this.delete(key);
                this.recordMetric("cache-expired", 1);
                return null;
            }

            // Decompress if needed
            if (entry.compressed) {
                entry.data = (await this.decompress(entry.data as string)) as T;
            }

            // Decrypt if needed
            if (this.config.enableEncryption && typeof entry.data === "string") {
                entry.data = JSON.parse(await this.decrypt(entry.data as string)) as T;
            }

            // Promote to faster layer if not already there
            if (entry.layer !== CacheLayer.MEMORY) {
                await this.set(key, entry.data, { layer: CacheLayer.MEMORY, ttl: entry.ttl / 1000 });
            }

            const duration = performance.now() - startTime;
            this.recordMetric("cache-hit", 1);
            this.recordMetric(`cache-hit-${entry.layer}`, 1);
            this.recordMetric("cache-get-duration", duration);

            return entry.data;
        } catch (error) {
            console.error("Cache get error:", error);
            this.recordMetric("cache-error", 1);
            return null;
        }
    }

    // Delete cache entry
    async delete(key: string, layer?: CacheLayer): Promise<void> {
        if (layer) {
            await this.deleteFromLayer(key, layer);
        } else {
            // Delete from all layers
            const layers = [CacheLayer.MEMORY, CacheLayer.REDIS, CacheLayer.DATABASE, CacheLayer.CDN];
            await Promise.all(layers.map((l) => this.deleteFromLayer(key, l)));
        }

        this.recordMetric("cache-delete", 1);
    }

    // Invalidate cache by tags
    async invalidateByTags(tags: string[]): Promise<void> {
        const keysToDelete: string[] = [];

        // Find keys with matching tags
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.tags.some((tag) => tags.includes(tag))) {
                keysToDelete.push(key);
            }
        }

        // Delete matching keys
        await Promise.all(keysToDelete.map((key) => this.delete(key)));

        this.recordMetric("cache-invalidate-tags", keysToDelete.length);
    }

    // Clear all cache
    async clear(): Promise<void> {
        this.memoryCache.clear();

        if (this.redisCache) {
            await this.redisCache.flushdb();
        }

        if (this.databaseCache) {
            await this.databaseCache.clear();
        }

        if (this.cdnCache) {
            await this.cdnCache.clear();
        }

        this.recordMetric("cache-clear", 1);
    }

    // Get cache statistics
    getStats(): Record<string, any> {
        const stats: Record<string, any> = {
            memory: {
                size: this.memoryCache.size,
                maxSize: this.memoryCache.max,
                hitRate: this.calculateHitRate("cache-hit", "cache-miss")
            },
            redis: {
                connected: !!this.redisCache,
                hitRate: this.calculateHitRate("cache-hit-redis", "cache-miss-redis")
            },
            database: {
                connected: !!this.databaseCache,
                hitRate: this.calculateHitRate("cache-hit-database", "cache-miss-database")
            },
            cdn: {
                connected: !!this.cdnCache,
                hitRate: this.calculateHitRate("cache-hit-cdn", "cache-miss-cdn")
            },
            overall: {
                hitRate: this.calculateHitRate("cache-hit", "cache-miss"),
                averageGetDuration: this.getAverageMetric("cache-get-duration"),
                totalOperations: this.getTotalOperations()
            }
        };

        return stats;
    }

    // Get from specific layer
    private async getFromLayer<T>(key: string, layer: CacheLayer): Promise<CacheEntry<T> | null> {
        try {
            switch (layer) {
                case CacheLayer.MEMORY:
                    return this.memoryCache.get(key) || null;
                case CacheLayer.REDIS:
                    if (this.redisCache) {
                        const data = await this.redisCache.get(key);
                        return data ? JSON.parse(data) : null;
                    }
                    return null;
                case CacheLayer.DATABASE:
                    if (this.databaseCache) {
                        return await this.databaseCache.get(key);
                    }
                    return null;
                case CacheLayer.CDN:
                    if (this.cdnCache) {
                        return await this.cdnCache.get(key);
                    }
                    return null;
                default:
                    return null;
            }
        } catch (error) {
            console.error(`Error getting from ${layer}:`, error);
            return null;
        }
    }

    // Delete from specific layer
    private async deleteFromLayer(key: string, layer: CacheLayer): Promise<void> {
        try {
            switch (layer) {
                case CacheLayer.MEMORY:
                    this.memoryCache.delete(key);
                    break;
                case CacheLayer.REDIS:
                    if (this.redisCache) {
                        await this.redisCache.del(key);
                    }
                    break;
                case CacheLayer.DATABASE:
                    if (this.databaseCache) {
                        await this.databaseCache.delete(key);
                    }
                    break;
                case CacheLayer.CDN:
                    if (this.cdnCache) {
                        await this.cdnCache.delete(key);
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error deleting from ${layer}:`, error);
        }
    }

    // Compress data
    private async compress(data: string): Promise<string> {
        // This would use actual compression library like zlib
        // For now, return base64 encoded data
        return Buffer.from(data).toString("base64");
    }

    // Decompress data
    private async decompress(data: string): Promise<string> {
        // This would use actual decompression library like zlib
        // For now, return base64 decoded data
        return Buffer.from(data, "base64").toString();
    }

    // Encrypt data
    private async encrypt(data: string): Promise<string> {
        if (!this.config.encryptionKey) {
            throw new Error("Encryption key not configured");
        }

        const hmac = createHmac("sha256", this.config.encryptionKey);
        hmac.update(data);
        return hmac.digest("hex");
    }

    // Decrypt data
    private async decrypt(data: string): Promise<string> {
        // This would implement actual decryption
        // For now, return the data as-is
        return data;
    }

    // Record metric
    private recordMetric(name: string, value: number): void {
        const current = this.metrics.get(name) || 0;
        this.metrics.set(name, current + value);
    }

    // Calculate hit rate
    private calculateHitRate(hitMetric: string, missMetric: string): number {
        const hits = this.metrics.get(hitMetric) || 0;
        const misses = this.metrics.get(missMetric) || 0;
        const total = hits + misses;
        return total > 0 ? (hits / total) * 100 : 0;
    }

    // Get average metric
    private getAverageMetric(metric: string): number {
        const values = this.metrics.get(metric) || [];
        if (Array.isArray(values) && values.length > 0) {
            return values.reduce((a, b) => a + b, 0) / values.length;
        }
        return 0;
    }

    // Get total operations
    private getTotalOperations(): number {
        const hits = this.metrics.get("cache-hit") || 0;
        const misses = this.metrics.get("cache-miss") || 0;
        return hits + misses;
    }

    // Set Redis client
    setRedisClient(client: any): void {
        this.redisCache = client;
    }

    // Set database cache client
    setDatabaseCache(client: any): void {
        this.databaseCache = client;
    }

    // Set CDN cache client
    setCdnCache(client: any): void {
        this.cdnCache = client;
    }
}

// Cache decorator for functions
export function Cacheable(
    options: {
        ttl?: number;
        layer?: CacheLayer;
        tags?: string[];
        keyGenerator?: (...args: any[]) => string;
        condition?: (...args: any[]) => boolean;
    } = {}
) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        const cache = MultiLayerCache.getInstance();

        descriptor.value = async function (...args: any[]) {
            const { ttl = 300, layer = CacheLayer.MEMORY, tags = [], keyGenerator, condition } = options;

            // Check condition
            if (condition && !condition(...args)) {
                return originalMethod.apply(this, args);
            }

            // Generate cache key
            const key = keyGenerator
                ? keyGenerator(...args)
                : `${target.constructor.name}:${propertyName}:${createHash("md5").update(JSON.stringify(args)).digest("hex")}`;

            // Try to get from cache
            const cached = await cache.get(key, layer);
            if (cached !== null) {
                return cached;
            }

            // Execute original method
            const result = await originalMethod.apply(this, args);

            // Cache result
            await cache.set(key, result, { ttl, layer, tags });

            return result;
        };

        return descriptor;
    };
}

// Cache middleware for Express
export function cacheMiddleware(
    options: {
        ttl?: number;
        layer?: CacheLayer;
        tags?: string[];
        keyGenerator?: (req: any) => string;
        condition?: (req: any) => boolean;
    } = {}
) {
    const cache = MultiLayerCache.getInstance();

    return async (req: any, res: any, next: any) => {
        const { ttl = 300, layer = CacheLayer.MEMORY, tags = [], keyGenerator, condition } = options;

        // Check condition
        if (condition && !condition(req)) {
            return next();
        }

        // Generate cache key
        const key = keyGenerator
            ? keyGenerator(req)
            : `request:${req.method}:${req.path}:${createHash("md5").update(JSON.stringify(req.query)).digest("hex")}`;

        // Try to get from cache
        const cached = await cache.get(key, layer);
        if (cached !== null) {
            res.json(cached);
            return;
        }

        // Store original methods
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.json = (body: any) => {
            cache.set(key, body, { ttl, layer, tags });
            return originalJson(body);
        };

        res.send = (body: any) => {
            cache.set(key, body, { ttl, layer, tags });
            return originalSend(body);
        };

        next();
    };
}

// Export singleton instance
export const multiLayerCache = MultiLayerCache.getInstance({
    defaultTtl: 300,
    maxMemorySize: 1000,
    compressionThreshold: 1024,
    enableCompression: true,
    enableEncryption: false
});
