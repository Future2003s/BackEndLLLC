# API Quản Lý Hình Ảnh Sản Phẩm - Documentation

## Tổng Quan

Bộ API quản lý hình ảnh cho sản phẩm đã được triển khai đầy đủ với 3 endpoint chính, tuân thủ nguyên tắc RESTful và tích hợp với hệ thống xác thực hiện có.

## Cấu Trúc Dữ Liệu

### Product Images Schema
```typescript
images: Array<{
    _id?: mongoose.Types.ObjectId;  // Auto-generated ID cho mỗi ảnh
    url: string;                    // URL công khai của ảnh
    alt?: string;                   // Alt text mô tả ảnh
    isMain: boolean;                // Đánh dấu ảnh chính
    order: number;                  // Thứ tự hiển thị
}>
```

## API Endpoints

### 1. POST /api/v1/products/:id/images
**Mục đích:** Upload một hoặc nhiều hình ảnh cho sản phẩm

**Xác thực:** Yêu cầu `admin` hoặc `seller`

**Request:**
- **Content-Type:** `multipart/form-data`
- **Form Field:** `images` (1-5 files)

**Validation:**
- Tối đa 5 ảnh mỗi lần upload
- Tối đa 10 ảnh tổng cộng cho mỗi sản phẩm
- Kích thước file tối đa: 5MB
- Định dạng cho phép: JPEG, PNG, WebP

**Response (201):**
```json
{
    "success": true,
    "message": "Successfully uploaded 3 image(s)",
    "data": {
        "_id": "productId",
        "name": "Product Name",
        "images": [
            {
                "_id": "imageId1",
                "url": "http://localhost:8081/uploads/products/image1.jpg",
                "alt": "Product image 1",
                "isMain": true,
                "order": 0
            }
        ]
    }
}
```

### 2. PUT /api/v1/products/:id/images
**Mục đích:** Cập nhật metadata của hình ảnh (alt, order, isMain)

**Xác thực:** Yêu cầu `admin` hoặc `seller`

**Request:**
```json
{
    "images": [
        {
            "imageId": "imageId1",
            "alt": "Mô tả ảnh mới",
            "order": 1
        },
        {
            "imageId": "imageId2",
            "isMain": true,
            "order": 0
        }
    ]
}
```

**Logic đặc biệt:**
- Chỉ có 1 ảnh được phép có `isMain: true`
- Khi set 1 ảnh thành `isMain: true`, tất cả ảnh khác tự động thành `false`

**Response (200):**
```json
{
    "success": true,
    "message": "Image metadata updated successfully",
    "data": { /* Updated product object */ }
}
```

### 3. DELETE /api/v1/products/:id/images
**Mục đích:** Xóa một hoặc nhiều hình ảnh

**Xác thực:** Yêu cầu `admin` hoặc `seller`

**Request:**
```json
{
    "imageIds": ["imageId1", "imageId2"]
}
```

**Logic đặc biệt:**
- Xóa file vật lý khỏi server
- Nếu xóa ảnh `isMain`, tự động set ảnh đầu tiên còn lại làm ảnh chính

**Response (200):**
```json
{
    "success": true,
    "message": "Successfully deleted 2 image(s)",
    "data": { /* Updated product object */ }
}
```

## Các Tính Năng Đã Triển Khai

### 1. Upload Middleware (`src/middleware/upload.ts`)
- Cấu hình Multer cho multipart/form-data
- Validation file type và size
- Tạo tên file unique tránh conflict
- Error handling cho các lỗi upload

### 2. Image Helper Functions (`src/utils/imageHelpers.ts`)
- `validateImageLimits()`: Kiểm tra giới hạn số lượng ảnh
- `ensureOnlyOneMainImage()`: Đảm bảo chỉ có 1 ảnh chính
- `setFirstAsMainIfNeeded()`: Tự động set ảnh đầu làm ảnh chính
- `cleanupImageFiles()`: Xóa file vật lý
- `updateImageMetadata()`: Cập nhật metadata ảnh
- `sortImagesByOrder()`: Sắp xếp ảnh theo thứ tự

### 3. Controller (`src/controllers/productImageController.ts`)
- `uploadProductImages()`: Xử lý upload ảnh
- `updateProductImageMetadata()`: Cập nhật metadata
- `deleteProductImages()`: Xóa ảnh

### 4. Routes Integration (`src/routes/products.ts`)
- Tích hợp 3 endpoint mới vào routes hiện có
- Áp dụng middleware xác thực và rate limiting
- Error handling với `handleMulterError`

## Bảo Mật & Validation

### Xác Thực
- Tất cả endpoint yêu cầu JWT token
- Chỉ `admin` và `seller` có quyền truy cập
- Kiểm tra quyền sở hữu sản phẩm (seller chỉ sửa sản phẩm của mình)

### Validation
- File type: chỉ cho phép JPEG, PNG, WebP
- File size: tối đa 5MB mỗi file
- Số lượng: tối đa 5 files/request, 10 files/product
- Input validation cho metadata update

### Error Handling
- Cleanup file khi có lỗi
- Validation error messages rõ ràng
- Proper HTTP status codes

## Cấu Hình Static Files

Static files được serve tại `/uploads/products/` với caching 1 ngày:

```typescript
app.use("/uploads", express.static("uploads", {
    maxAge: "1d",
    etag: true,
    lastModified: true
}));
```

## Testing

Đã tạo các file test:
- `test-product-images-api.js`: Test tổng hợp tất cả API
- `simple-image-api-test.js`: Test đơn giản với error handling
- `create-test-users.js`: Tạo user test cho authentication

## Cách Sử Dụng

### 1. Upload Ảnh
```bash
curl -X POST \
  http://localhost:8081/api/v1/products/{productId}/images \
  -H 'Authorization: Bearer {token}' \
  -F 'images=@image1.jpg' \
  -F 'images=@image2.jpg'
```

### 2. Cập Nhật Metadata
```bash
curl -X PUT \
  http://localhost:8081/api/v1/products/{productId}/images \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "images": [
      {
        "imageId": "imageId1",
        "alt": "New description",
        "isMain": true
      }
    ]
  }'
```

### 3. Xóa Ảnh
```bash
curl -X DELETE \
  http://localhost:8081/api/v1/products/{productId}/images \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "imageIds": ["imageId1", "imageId2"]
  }'
```

## Lưu Ý Quan Trọng

1. **File Storage**: Ảnh được lưu trong thư mục `uploads/products/`
2. **URL Generation**: URL ảnh được tạo dựa trên `BASE_URL` environment variable
3. **Cleanup**: Khi xóa ảnh, cả database record và file vật lý đều được xóa
4. **Main Image Logic**: Luôn đảm bảo có ít nhất 1 ảnh chính nếu sản phẩm có ảnh
5. **Permission**: Seller chỉ có thể sửa sản phẩm do họ tạo, Admin có thể sửa tất cả

## Các Files Đã Tạo/Sửa Đổi

1. **Mới tạo:**
   - `src/middleware/upload.ts`
   - `src/utils/imageHelpers.ts`
   - `src/controllers/productImageController.ts`
   - `test-product-images-api.js`
   - `simple-image-api-test.js`

2. **Đã sửa đổi:**
   - `src/models/Product.ts` (thêm _id cho images)
   - `src/routes/products.ts` (thêm 3 routes mới)

API đã sẵn sàng sử dụng và tuân thủ đầy đủ các yêu cầu đã đề ra!
