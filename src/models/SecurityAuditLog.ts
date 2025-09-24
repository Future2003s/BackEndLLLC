import mongoose, { Document, Schema } from "mongoose";

export interface ISecurityAuditLog extends Document {
    userId?: mongoose.Types.ObjectId;
    sessionId?: string;
    eventType:
        | "login"
        | "logout"
        | "password_change"
        | "2fa_enable"
        | "2fa_disable"
        | "session_terminate"
        | "suspicious_activity"
        | "account_locked"
        | "password_reset"
        | "email_change"
        | "profile_update";
    eventDetails: {
        action: string;
        description: string;
        result: "success" | "failure" | "blocked";
        errorReason?: string;
    };
    deviceInfo?: {
        deviceName: string;
        deviceType: "desktop" | "mobile" | "tablet";
        browser: string;
        os: string;
        userAgent: string;
    };
    networkInfo: {
        ipAddress: string;
        location?: string;
        country?: string;
        userAgent: string;
    };
    securityContext: {
        riskScore: number;
        isSuspicious: boolean;
        suspiciousReasons?: string[];
        preventedAttack?: string;
    };
    metadata: {
        timestamp: Date;
        serverInfo: {
            hostname: string;
            environment: string;
            version: string;
        };
        requestId?: string;
        correlationId?: string;
    };
}

const SecurityAuditLogSchema = new Schema<ISecurityAuditLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        sessionId: {
            type: String,
            index: true
        },
        eventType: {
            type: String,
            enum: [
                "login",
                "logout",
                "password_change",
                "2fa_enable",
                "2fa_disable",
                "session_terminate",
                "suspicious_activity",
                "account_locked",
                "password_reset",
                "email_change",
                "profile_update"
            ],
            required: true,
            index: true
        },
        eventDetails: {
            action: { type: String, required: true },
            description: { type: String, required: true },
            result: {
                type: String,
                enum: ["success", "failure", "blocked"],
                required: true,
                index: true
            },
            errorReason: { type: String }
        },
        deviceInfo: {
            deviceName: { type: String },
            deviceType: {
                type: String,
                enum: ["desktop", "mobile", "tablet"]
            },
            browser: { type: String },
            os: { type: String },
            userAgent: { type: String }
        },
        networkInfo: {
            ipAddress: { type: String, required: true, index: true },
            location: { type: String },
            country: { type: String },
            userAgent: { type: String, required: true }
        },
        securityContext: {
            riskScore: { type: Number, default: 0, min: 0, max: 100 },
            isSuspicious: { type: Boolean, default: false, index: true },
            suspiciousReasons: [{ type: String }],
            preventedAttack: { type: String }
        },
        metadata: {
            timestamp: { type: Date, default: Date.now, index: true },
            serverInfo: {
                hostname: { type: String, required: true },
                environment: { type: String, required: true },
                version: { type: String, required: true }
            },
            requestId: { type: String },
            correlationId: { type: String }
        }
    },
    {
        timestamps: true,
        collection: "security_audit_logs"
    }
);

// Compound indexes for efficient queries
SecurityAuditLogSchema.index({ userId: 1, "metadata.timestamp": -1 });
SecurityAuditLogSchema.index({ eventType: 1, "metadata.timestamp": -1 });
SecurityAuditLogSchema.index({ "networkInfo.ipAddress": 1, "metadata.timestamp": -1 });
SecurityAuditLogSchema.index({ "securityContext.isSuspicious": 1, "metadata.timestamp": -1 });

// TTL index to automatically delete old logs (keep for 1 year)
SecurityAuditLogSchema.index({ "metadata.timestamp": 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static methods
SecurityAuditLogSchema.statics.logSecurityEvent = function (eventData: Partial<ISecurityAuditLog>) {
    const log = new this({
        ...eventData,
        metadata: {
            ...eventData.metadata,
            timestamp: new Date(),
            serverInfo: {
                hostname: process.env.HOSTNAME || "unknown",
                environment: process.env.NODE_ENV || "development",
                version: process.env.APP_VERSION || "1.0.0"
            }
        }
    });
    return log.save();
};

SecurityAuditLogSchema.statics.getUserSecurityHistory = function (userId: string, limit: number = 50) {
    return this.find({ userId }).sort({ "metadata.timestamp": -1 }).limit(limit).select("-__v");
};

SecurityAuditLogSchema.statics.getSuspiciousActivities = function (
    timeframe: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)
) {
    return this.find({
        "securityContext.isSuspicious": true,
        "metadata.timestamp": { $gte: timeframe }
    }).sort({ "metadata.timestamp": -1 });
};

export const SecurityAuditLog = mongoose.model<ISecurityAuditLog>("SecurityAuditLog", SecurityAuditLogSchema);
