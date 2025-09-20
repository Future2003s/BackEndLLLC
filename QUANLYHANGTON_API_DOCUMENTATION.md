# 📦 QuanLyHangTon API Documentation

## Base URL

```
http://localhost:8081/api/v1
```

## 🚀 Quick Test

```bash
curl -X GET http://localhost:8081/health
curl -X GET http://localhost:8081/api/v1/test
```

## 🔐 Authentication

All inventory management endpoints require authentication. Include the JWT token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

## 📋 Inventory Management APIs

### 1. Get Inventory Overview

**GET** `/inventory/overview`

**Description:** Get comprehensive inventory overview including stock levels, categories, and total value.

**Response:**

```json
{
    "success": true,
    "message": "Inventory overview retrieved successfully",
    "data": {
        "totalProducts": 150,
        "lowStockProducts": 12,
        "outOfStockProducts": 3,
        "totalValue": 2500000,
        "categories": ["Electronics", "Clothing", "Books"],
        "brands": ["Apple", "Samsung", "Nike"],
        "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
}
```

### 2. Get Low Stock Products

**GET** `/inventory/low-stock`

**Query Parameters:**

- `threshold` (optional): Stock threshold (default: 10)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
    "success": true,
    "message": "Low stock products retrieved successfully",
    "data": {
        "products": [
            {
                "_id": "product_id",
                "name": "iPhone 15",
                "sku": "IPH15-128",
                "price": 25000000,
                "stock": 5,
                "minStock": 10,
                "maxStock": 100,
                "category": { "name": "Electronics" },
                "brand": { "name": "Apple" },
                "updatedAt": "2024-01-15T10:30:00.000Z"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 12,
            "pages": 1
        }
    }
}
```

### 3. Get Inventory Products

**GET** `/inventory/products`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `category` (optional): Category name
- `brand` (optional): Brand name
- `status` (optional): Stock status (in_stock, low_stock, out_of_stock)
- `sortBy` (optional): Sort field (default: name)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**

```json
{
    "success": true,
    "message": "Inventory products retrieved successfully",
    "data": {
        "products": [...],
        "pagination": {...}
    }
}
```

### 4. Update Product Stock

**PUT** `/inventory/stock/:productId`

**Request Body:**

```json
{
    "stock": 50,
    "operation": "set" // "set", "add", "subtract"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Stock updated successfully",
    "data": {
        "productId": "product_id",
        "oldStock": 30,
        "newStock": 50,
        "operation": "set"
    }
}
```

### 5. Bulk Update Stock

**PUT** `/inventory/bulk-stock`

**Request Body:**

```json
{
    "updates": [
        {
            "productId": "product_id_1",
            "stock": 100,
            "operation": "set"
        },
        {
            "productId": "product_id_2",
            "stock": 20,
            "operation": "add"
        }
    ]
}
```

**Response:**

```json
{
    "success": true,
    "message": "Bulk stock update completed",
    "data": {
        "results": [...],
        "errors": [],
        "summary": {
            "total": 2,
            "successful": 2,
            "failed": 0
        }
    }
}
```

### 6. Get Inventory Analytics

**GET** `/inventory/analytics`

**Query Parameters:**

- `period` (optional): Time period (7d, 30d, 90d)

**Response:**

```json
{
    "success": true,
    "message": "Inventory analytics retrieved successfully",
    "data": {
        "stockLevels": {
            "in_stock": 120,
            "low_stock": 12,
            "out_of_stock": 3
        },
        "categoryDistribution": [
            {
                "_id": "Electronics",
                "count": 50,
                "totalValue": 1500000
            }
        ],
        "brandDistribution": [...],
        "stockHistory": [...],
        "period": "30d",
        "generatedAt": "2024-01-15T10:30:00.000Z"
    }
}
```

## 📥 Import/Export Management APIs

### 1. Get Import Records

**GET** `/import-export/imports`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `status` (optional): Record status
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**

```json
{
    "success": true,
    "message": "Import records retrieved successfully",
    "data": {
        "records": [
            {
                "id": "IMP-1705312200000",
                "importCode": "IMP-1705312200000",
                "supplier": "Apple Inc.",
                "totalItems": 50,
                "totalValue": 125000000,
                "items": [
                    {
                        "productId": "product_id",
                        "productName": "iPhone 15",
                        "quantity": 25,
                        "unitPrice": 25000000
                    }
                ],
                "importDate": "2024-01-15",
                "status": "completed",
                "createdBy": "John Doe",
                "createdAt": "2024-01-15T10:30:00.000Z",
                "notes": "Bulk import for Q1"
            }
        ],
        "pagination": {...}
    }
}
```

### 2. Create Import Record

**POST** `/import-export/imports`

**Request Body:**

```json
{
    "supplier": "Apple Inc.",
    "items": [
        {
            "productId": "product_id",
            "quantity": 25,
            "unitPrice": 25000000
        }
    ],
    "notes": "Bulk import for Q1",
    "importDate": "2024-01-15"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Import record created successfully",
    "data": {
        "id": "IMP-1705312200000",
        "importCode": "IMP-1705312200000",
        "supplier": "Apple Inc.",
        "totalItems": 25,
        "totalValue": 625000000,
        "items": [...],
        "importDate": "2024-01-15",
        "status": "completed",
        "createdBy": "John Doe",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "notes": "Bulk import for Q1"
    }
}
```

### 3. Get Export Records

**GET** `/import-export/exports`

**Query Parameters:** Same as import records

**Response:** Similar structure to import records

### 4. Create Export Record

**POST** `/import-export/exports`

**Request Body:**

```json
{
    "customer": "ABC Company",
    "items": [
        {
            "productId": "product_id",
            "quantity": 10,
            "unitPrice": 25000000
        }
    ],
    "notes": "Bulk export order",
    "exportDate": "2024-01-15"
}
```

### 5. Get Import/Export Summary

**GET** `/import-export/summary`

**Query Parameters:**

- `period` (optional): Time period (7d, 30d, 90d)

**Response:**

```json
{
    "success": true,
    "message": "Import/Export summary retrieved successfully",
    "data": {
        "period": "30d",
        "overview": {
            "totalImports": 15,
            "totalExports": 8,
            "totalImportValue": 500000000,
            "totalExportValue": 200000000,
            "totalImportItems": 500,
            "totalExportItems": 200,
            "netValue": 300000000
        },
        "statusDistribution": {
            "imports": {
                "completed": 12,
                "pending": 2,
                "cancelled": 1
            },
            "exports": {
                "completed": 6,
                "pending": 2
            }
        },
        "dailyTrends": [...],
        "generatedAt": "2024-01-15T10:30:00.000Z"
    }
}
```

## 🔔 Notification APIs

### 1. Get Notifications

**GET** `/notifications`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Notification type
- `status` (optional): Notification status (unread, read)
- `priority` (optional): Priority level
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**

```json
{
    "success": true,
    "message": "Notifications retrieved successfully",
    "data": {
        "notifications": [
            {
                "id": "notif-1705312200000",
                "type": "low_stock",
                "title": "Sản phẩm sắp hết hàng",
                "message": "iPhone 15 chỉ còn 5 sản phẩm",
                "priority": "high",
                "data": {
                    "productId": "product_id",
                    "productName": "iPhone 15",
                    "currentStock": 5
                },
                "userId": null,
                "status": "unread",
                "createdAt": "2024-01-15T10:30:00.000Z",
                "readAt": null
            }
        ],
        "pagination": {...}
    }
}
```

### 2. Get Notification Summary

**GET** `/notifications/summary`

**Response:**

```json
{
    "success": true,
    "message": "Notification summary retrieved successfully",
    "data": {
        "total": 25,
        "unread": 8,
        "read": 17,
        "byType": {
            "low_stock": 5,
            "out_of_stock": 2,
            "new_order": 3,
            "system": 10,
            "maintenance": 5
        },
        "byPriority": {
            "urgent": 2,
            "high": 5,
            "medium": 10,
            "low": 8
        },
        "recent": [...],
        "generatedAt": "2024-01-15T10:30:00.000Z"
    }
}
```

### 3. Mark Notification as Read

**PUT** `/notifications/:id/read`

**Response:**

```json
{
    "success": true,
    "message": "Notification marked as read",
    "data": {
        "id": "notif-1705312200000",
        "status": "read",
        "readAt": "2024-01-15T10:35:00.000Z"
    }
}
```

### 4. Mark All Notifications as Read

**PUT** `/notifications/read-all`

**Response:**

```json
{
    "success": true,
    "message": "All notifications marked as read",
    "data": {
        "updatedCount": 8,
        "message": "8 notifications marked as read"
    }
}
```

### 5. Generate System Notifications

**POST** `/notifications/generate`

**Description:** Generate system notifications for low stock, out of stock, and new orders.

**Response:**

```json
{
    "success": true,
    "message": "System notifications generated successfully",
    "data": {
        "generated": 5,
        "notifications": [...]
    }
}
```

### 6. Get Notification Types

**GET** `/notifications/types`

**Response:**

```json
{
    "success": true,
    "message": "Notification types retrieved successfully",
    "data": [
        {
            "id": "low_stock",
            "name": "Sắp hết hàng",
            "description": "Thông báo khi sản phẩm sắp hết hàng",
            "icon": "⚠️",
            "color": "orange"
        },
        {
            "id": "out_of_stock",
            "name": "Hết hàng",
            "description": "Thông báo khi sản phẩm hết hàng",
            "icon": "🚨",
            "color": "red"
        }
    ]
}
```

## 🚀 Usage Examples

### JavaScript/TypeScript

```javascript
// Get inventory overview
const response = await fetch("http://localhost:8081/api/v1/inventory/overview", {
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    }
});
const data = await response.json();

// Update product stock
await fetch("http://localhost:8081/api/v1/inventory/stock/product_id", {
    method: "PUT",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        stock: 100,
        operation: "set"
    })
});

// Create import record
await fetch("http://localhost:8081/api/v1/import-export/imports", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        supplier: "Apple Inc.",
        items: [
            {
                productId: "product_id",
                quantity: 25,
                unitPrice: 25000000
            }
        ],
        notes: "Bulk import for Q1"
    })
});
```

### cURL Examples

```bash
# Get inventory overview
curl -X GET "http://localhost:8081/api/v1/inventory/overview" \
  -H "Authorization: Bearer your_jwt_token"

# Update product stock
curl -X PUT "http://localhost:8081/api/v1/inventory/stock/product_id" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"stock": 100, "operation": "set"}'

# Get notifications
curl -X GET "http://localhost:8081/api/v1/notifications" \
  -H "Authorization: Bearer your_jwt_token"
```

## 📊 Error Responses

All endpoints return consistent error responses:

```json
{
    "success": false,
    "message": "Error description",
    "error": {
        "code": "ERROR_CODE",
        "details": "Additional error details"
    }
}
```

## 🔧 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. All monetary values are in VND (Vietnamese Dong)
3. Pagination is 1-indexed
4. All endpoints require authentication except health check
5. Rate limiting is applied to prevent abuse
6. Caching is implemented for performance optimization
