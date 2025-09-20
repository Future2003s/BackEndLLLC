"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = exports.swaggerOptions = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
// Basic Swagger/OpenAPI configuration
exports.swaggerOptions = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "ShopDev Reviews & Ratings API",
            version: "1.0.0",
            description: "REST API for product reviews, ratings, helpfulness voting, and moderation. Part of the ShopDev platform.",
            contact: {
                name: "ShopDev Team"
            }
        },
        servers: [
            { url: "/api/v1", description: "API base path (proxied)" },
            { url: "http://localhost:8081/api/v1", description: "Local development" }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            },
            schemas: {
                Review: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        product: { type: "string", description: "Product ID" },
                        user: { type: "string", description: "User ID" },
                        rating: { type: "integer", minimum: 1, maximum: 5 },
                        title: { type: "string" },
                        comment: { type: "string" },
                        images: { type: "array", items: { type: "string" } },
                        isVerifiedPurchase: { type: "boolean" },
                        status: { type: "string", enum: ["pending", "approved", "rejected"] },
                        helpfulCount: { type: "integer" },
                        notHelpfulCount: { type: "integer" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                }
            }
        }
    },
    // Scan route/controller files for JSDoc annotations if present
    apis: ["src/routes/*.ts", "src/controllers/*.ts"]
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(exports.swaggerOptions);
