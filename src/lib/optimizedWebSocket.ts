/**
 * Optimized WebSocket Implementation
 * High-performance WebSocket server with advanced features
 */

import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { performance } from "perf_hooks";
import { LRU } from "lru-cache";

// WebSocket event types
export interface ServerToClientEvents {
    notification: (data: NotificationData) => void;
    orderUpdate: (data: OrderUpdateData) => void;
    inventoryUpdate: (data: InventoryUpdateData) => void;
    message: (data: ChatMessageData) => void;
    userJoined: (data: UserPresenceData) => void;
    userLeft: (data: UserPresenceData) => void;
    connectionStatus: (data: ConnectionStatusData) => void;
    error: (data: ErrorData) => void;
    ping: () => void;
    pong: () => void;
}

export interface ClientToServerEvents {
    authenticate: (token: string) => void;
    subscribeToNotifications: () => void;
    unsubscribeFromNotifications: () => void;
    joinRoom: (roomId: string) => void;
    leaveRoom: (roomId: string) => void;
    sendMessage: (data: ChatMessageData) => void;
    subscribeToOrder: (orderId: string) => void;
    unsubscribeFromOrder: (orderId: string) => void;
    subscribeToInventory: (productId: string) => void;
    unsubscribeFromInventory: (productId: string) => void;
    updatePresence: (data: UserPresenceData) => void;
    pong: () => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId?: string;
    user?: any;
    isAuthenticated: boolean;
    rooms: Set<string>;
    lastPing: number;
    connectionTime: number;
}

// Data interfaces
export interface NotificationData {
    id: string;
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    timestamp: Date;
    userId?: string;
    orderId?: string;
    productId?: string;
}

export interface OrderUpdateData {
    orderId: string;
    status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
    message: string;
    timestamp: Date;
    trackingNumber?: string;
    estimatedDelivery?: Date;
}

export interface InventoryUpdateData {
    productId: string;
    quantity: number;
    previousQuantity: number;
    message: string;
    timestamp: Date;
}

export interface ChatMessageData {
    id: string;
    roomId: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: Date;
    type: "text" | "image" | "file";
}

export interface UserPresenceData {
    userId: string;
    userName: string;
    status: "online" | "away" | "busy" | "offline";
    lastSeen: Date;
    roomId?: string;
}

export interface ConnectionStatusData {
    status: "connected" | "disconnected" | "reconnecting";
    timestamp: Date;
    message?: string;
}

export interface ErrorData {
    code: string;
    message: string;
    timestamp: Date;
}

// Performance monitoring
export class WebSocketPerformanceMonitor {
    private static instance: WebSocketPerformanceMonitor;
    private metrics: Map<string, number[]> = new Map();
    private connectionStats: Map<string, any> = new Map();

    static getInstance(): WebSocketPerformanceMonitor {
        if (!WebSocketPerformanceMonitor.instance) {
            WebSocketPerformanceMonitor.instance = new WebSocketPerformanceMonitor();
        }
        return WebSocketPerformanceMonitor.instance;
    }

    recordMetric(name: string, value: number): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const values = this.metrics.get(name)!;
        values.push(value);

        if (values.length > 1000) {
            values.shift();
        }
    }

    recordConnectionStats(socketId: string, stats: any): void {
        this.connectionStats.set(socketId, {
            ...stats,
            timestamp: Date.now()
        });
    }

    getMetrics(): Record<string, any> {
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

    getConnectionStats(): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [socketId, stats] of this.connectionStats.entries()) {
            result[socketId] = stats;
        }
        return result;
    }
}

// Optimized WebSocket Manager
export class OptimizedWebSocketManager {
    private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
    private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
    private userRooms: Map<string, Set<string>> = new Map(); // userId -> Set<roomId>
    private roomUsers: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>
    private messageCache: LRU<string, any>;
    private performanceMonitor: WebSocketPerformanceMonitor;
    private pingInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(httpServer: HTTPServer) {
        this.performanceMonitor = WebSocketPerformanceMonitor.getInstance();

        // Initialize message cache
        this.messageCache = new LRU({
            max: 10000,
            ttl: 1000 * 60 * 5, // 5 minutes
            updateAgeOnGet: true,
            updateAgeOnHas: true
        });

        this.io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
            httpServer,
            {
                cors: {
                    origin: process.env.FRONTEND_URL || "http://localhost:3000",
                    methods: ["GET", "POST"],
                    credentials: true
                },
                transports: ["websocket", "polling"],
                pingTimeout: 60000,
                pingInterval: 25000,
                maxHttpBufferSize: 1e6, // 1MB
                allowEIO3: true,
                // Performance optimizations
                compression: true,
                perMessageDeflate: {
                    threshold: 1024,
                    concurrencyLimit: 10,
                    memLevel: 7
                }
            }
        );

        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupPeriodicTasks();
    }

    private setupMiddleware(): void {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const startTime = performance.now();

                const token =
                    socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

                if (!token) {
                    return next(new Error("Authentication required"));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

                // Cache user data
                const userCacheKey = `user:${decoded.userId}`;
                let user = this.messageCache.get(userCacheKey);

                if (!user) {
                    // This would fetch from database
                    user = { _id: decoded.userId, firstName: "User", lastName: "Name" };
                    this.messageCache.set(userCacheKey, user);
                }

                socket.data.userId = user._id.toString();
                socket.data.user = user;
                socket.data.isAuthenticated = true;
                socket.data.rooms = new Set();
                socket.data.lastPing = Date.now();
                socket.data.connectionTime = Date.now();

                const duration = performance.now() - startTime;
                this.performanceMonitor.recordMetric("auth-duration", duration);

                next();
            } catch (error) {
                next(new Error("Invalid token"));
            }
        });

        // Rate limiting middleware
        this.io.use((socket, next) => {
            const ip = socket.handshake.address;
            const rateLimitKey = `rate:${ip}`;

            const current = this.messageCache.get(rateLimitKey) || { count: 0, resetTime: Date.now() + 60000 };

            if (Date.now() > current.resetTime) {
                current.count = 0;
                current.resetTime = Date.now() + 60000;
            }

            if (current.count >= 100) {
                // 100 connections per minute
                return next(new Error("Rate limit exceeded"));
            }

            current.count++;
            this.messageCache.set(rateLimitKey, current);

            next();
        });
    }

    private setupEventHandlers(): void {
        this.io.on("connection", (socket) => {
            const startTime = performance.now();

            console.log(`User ${socket.data.userId} connected with socket ${socket.id}`);

            // Store user connection
            if (socket.data.userId) {
                this.connectedUsers.set(socket.data.userId, socket.id);
            }

            // Send connection status
            socket.emit("connectionStatus", {
                status: "connected",
                timestamp: new Date(),
                message: "Connected to real-time server"
            });

            // Authentication
            socket.on("authenticate", (token) => {
                // Already handled by middleware
                socket.emit("connectionStatus", {
                    status: "connected",
                    timestamp: new Date(),
                    message: "Authentication successful"
                });
            });

            // Notification subscriptions
            socket.on("subscribeToNotifications", () => {
                socket.join("notifications");
                console.log(`User ${socket.data.userId} subscribed to notifications`);
            });

            socket.on("unsubscribeFromNotifications", () => {
                socket.leave("notifications");
                console.log(`User ${socket.data.userId} unsubscribed from notifications`);
            });

            // Chat room management
            socket.on("joinRoom", (roomId) => {
                socket.join(roomId);
                socket.data.rooms.add(roomId);

                if (socket.data.userId) {
                    if (!this.userRooms.has(socket.data.userId)) {
                        this.userRooms.set(socket.data.userId, new Set());
                    }
                    this.userRooms.get(socket.data.userId)!.add(roomId);

                    if (!this.roomUsers.has(roomId)) {
                        this.roomUsers.set(roomId, new Set());
                    }
                    this.roomUsers.get(roomId)!.add(socket.data.userId);
                }

                // Notify others in the room
                socket.to(roomId).emit("userJoined", {
                    userId: socket.data.userId!,
                    userName: `${socket.data.user?.firstName} ${socket.data.user?.lastName}`,
                    status: "online",
                    lastSeen: new Date(),
                    roomId
                });

                console.log(`User ${socket.data.userId} joined room ${roomId}`);
            });

            socket.on("leaveRoom", (roomId) => {
                socket.leave(roomId);
                socket.data.rooms.delete(roomId);

                if (socket.data.userId) {
                    this.userRooms.get(socket.data.userId)?.delete(roomId);
                    this.roomUsers.get(roomId)?.delete(socket.data.userId);
                }

                // Notify others in the room
                socket.to(roomId).emit("userLeft", {
                    userId: socket.data.userId!,
                    userName: `${socket.data.user?.firstName} ${socket.data.user?.lastName}`,
                    status: "offline",
                    lastSeen: new Date(),
                    roomId
                });

                console.log(`User ${socket.data.userId} left room ${roomId}`);
            });

            // Chat messages
            socket.on("sendMessage", (data) => {
                const messageData: ChatMessageData = {
                    ...data,
                    id: this.generateId(),
                    userId: socket.data.userId!,
                    userName: `${socket.data.user?.firstName} ${socket.data.user?.lastName}`,
                    timestamp: new Date()
                };

                // Cache message
                const messageKey = `message:${data.roomId}:${messageData.id}`;
                this.messageCache.set(messageKey, messageData);

                // Broadcast to room
                socket.to(data.roomId).emit("message", messageData);
                console.log(`Message sent in room ${data.roomId} by ${socket.data.userId}`);
            });

            // Order tracking
            socket.on("subscribeToOrder", (orderId) => {
                socket.join(`order:${orderId}`);
                console.log(`User ${socket.data.userId} subscribed to order ${orderId}`);
            });

            socket.on("unsubscribeFromOrder", (orderId) => {
                socket.leave(`order:${orderId}`);
                console.log(`User ${socket.data.userId} unsubscribed from order ${orderId}`);
            });

            // Inventory updates
            socket.on("subscribeToInventory", (productId) => {
                socket.join(`inventory:${productId}`);
                console.log(`User ${socket.data.userId} subscribed to inventory ${productId}`);
            });

            socket.on("unsubscribeFromInventory", (productId) => {
                socket.leave(`inventory:${productId}`);
                console.log(`User ${socket.data.userId} unsubscribed from inventory ${productId}`);
            });

            // User presence
            socket.on("updatePresence", (data) => {
                // Broadcast presence update to all rooms user is in
                socket.data.rooms.forEach((roomId) => {
                    socket.to(roomId).emit("userJoined", {
                        ...data,
                        userId: socket.data.userId!,
                        lastSeen: new Date()
                    });
                });
            });

            // Ping/Pong handling
            socket.on("pong", () => {
                socket.data.lastPing = Date.now();
            });

            // Disconnection
            socket.on("disconnect", (reason) => {
                const duration = performance.now() - startTime;
                this.performanceMonitor.recordMetric("connection-duration", duration);

                console.log(`User ${socket.data.userId} disconnected: ${reason}`);

                if (socket.data.userId) {
                    this.connectedUsers.delete(socket.data.userId);

                    // Notify all rooms user was in
                    socket.data.rooms.forEach((roomId) => {
                        socket.to(roomId).emit("userLeft", {
                            userId: socket.data.userId!,
                            userName: `${socket.data.user?.firstName} ${socket.data.user?.lastName}`,
                            status: "offline",
                            lastSeen: new Date(),
                            roomId
                        });
                    });
                }
            });
        });
    }

    private setupPeriodicTasks(): void {
        // Send ping every 25 seconds
        this.pingInterval = setInterval(() => {
            this.io.emit("ping");
        }, 25000);

        // Clean up disconnected users every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanupDisconnectedUsers();
        }, 60000);

        // Clear old cache entries every 5 minutes
        setInterval(() => {
            this.messageCache.purgeStale();
        }, 300000);
    }

    private cleanupDisconnectedUsers(): void {
        const now = Date.now();
        const disconnectedUsers: string[] = [];

        for (const [userId, socketId] of this.connectedUsers.entries()) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (!socket || now - socket.data.lastPing > 120000) {
                // 2 minutes timeout
                disconnectedUsers.push(userId);
            }
        }

        disconnectedUsers.forEach((userId) => {
            this.connectedUsers.delete(userId);
            this.userRooms.delete(userId);
        });

        if (disconnectedUsers.length > 0) {
            console.log(`Cleaned up ${disconnectedUsers.length} disconnected users`);
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    // Public methods for sending notifications
    public sendNotification(userId: string, notification: Omit<NotificationData, "id" | "timestamp">): void {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit("notification", {
                    ...notification,
                    id: this.generateId(),
                    timestamp: new Date()
                });
            }
        }
    }

    public broadcastNotification(notification: Omit<NotificationData, "id" | "timestamp">): void {
        this.io.to("notifications").emit("notification", {
            ...notification,
            id: this.generateId(),
            timestamp: new Date()
        });
    }

    public sendOrderUpdate(orderId: string, update: Omit<OrderUpdateData, "timestamp">): void {
        this.io.to(`order:${orderId}`).emit("orderUpdate", {
            ...update,
            timestamp: new Date()
        });
    }

    public sendInventoryUpdate(productId: string, update: Omit<InventoryUpdateData, "timestamp">): void {
        this.io.to(`inventory:${productId}`).emit("inventoryUpdate", {
            ...update,
            timestamp: new Date()
        });
    }

    public getConnectedUsers(): string[] {
        return Array.from(this.connectedUsers.keys());
    }

    public isUserOnline(userId: string): boolean {
        return this.connectedUsers.has(userId);
    }

    public getRoomUsers(roomId: string): string[] {
        return Array.from(this.roomUsers.get(roomId) || []);
    }

    public getUserRooms(userId: string): string[] {
        return Array.from(this.userRooms.get(userId) || []);
    }

    public getPerformanceMetrics(): Record<string, any> {
        return this.performanceMonitor.getMetrics();
    }

    public getConnectionStats(): Record<string, any> {
        return this.performanceMonitor.getConnectionStats();
    }

    public getIO(): SocketIOServer {
        return this.io;
    }

    public destroy(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.io.close();
    }
}

export default OptimizedWebSocketManager;
