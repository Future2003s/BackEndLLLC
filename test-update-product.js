const axios = require("axios");

// Cấu hình API
const API_BASE_URL = "http://localhost:5000/api/v1";
const TEST_PRODUCT_ID = "64f8b8b8b8b8b8b8b8b8b8b8"; // Thay bằng ID thực tế

// Test data cho update sản phẩm
const updateData = {
    name: "Sản phẩm test cập nhật",
    price: 299000,
    sku: "TEST-UPDATE-001",
    description: "Mô tả sản phẩm đã được cập nhật",
    quantity: 50,
    isVisible: true,
    isFeatured: false
};

// Hàm test update sản phẩm
async function testUpdateProduct() {
    try {
        console.log("🚀 Bắt đầu test API update sản phẩm...");
        console.log("📝 Dữ liệu cập nhật:", JSON.stringify(updateData, null, 2));

        // Test 1: Update sản phẩm không có token (expect 401)
        console.log("\n📋 Test 1: Update sản phẩm không có token (expect 401)");
        try {
            const response = await axios.put(`${API_BASE_URL}/products/${TEST_PRODUCT_ID}`, updateData);
            console.log("❌ Test thất bại: Không nên thành công khi không có token");
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log("✅ Test thành công: Nhận được lỗi 401 (Unauthorized)");
            } else {
                console.log(
                    "❌ Test thất bại: Nhận được lỗi không mong đợi:",
                    error.response?.status,
                    error.response?.data
                );
            }
        }

        // Test 2: Update sản phẩm với dữ liệu thiếu (expect 400)
        console.log("\n📋 Test 2: Update sản phẩm với dữ liệu thiếu (expect 400)");
        try {
            const invalidData = { name: "Chỉ có tên" }; // Thiếu price và sku
            const response = await axios.put(`${API_BASE_URL}/products/${TEST_PRODUCT_ID}`, invalidData, {
                headers: {
                    Authorization: "Bearer fake-token"
                }
            });
            console.log("❌ Test thất bại: Không nên thành công khi thiếu dữ liệu");
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log("✅ Test thành công: Nhận được lỗi 400 (Bad Request)");
                console.log("📄 Thông báo lỗi:", error.response.data.message);
            } else {
                console.log(
                    "❌ Test thất bại: Nhận được lỗi không mong đợi:",
                    error.response?.status,
                    error.response?.data
                );
            }
        }

        // Test 3: Update sản phẩm với dữ liệu hợp lệ (expect 200/201)
        console.log("\n📋 Test 3: Update sản phẩm với dữ liệu hợp lệ (expect 200/201)");
        try {
            const response = await axios.put(`${API_BASE_URL}/products/${TEST_PRODUCT_ID}`, updateData, {
                headers: {
                    Authorization: "Bearer fake-token"
                }
            });
            console.log("❌ Test thất bại: Không nên thành công khi token không hợp lệ");
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log("✅ Test thành công: Nhận được lỗi 401 (Token không hợp lệ)");
            } else {
                console.log(
                    "❌ Test thất bại: Nhận được lỗi không mong đợi:",
                    error.response?.status,
                    error.response?.data
                );
            }
        }

        // Test 4: Test validation với dữ liệu rỗng
        console.log("\n📋 Test 4: Test validation với dữ liệu rỗng");
        try {
            const emptyData = { name: "", price: "", sku: "" };
            const response = await axios.put(`${API_BASE_URL}/products/${TEST_PRODUCT_ID}`, emptyData, {
                headers: {
                    Authorization: "Bearer fake-token"
                }
            });
            console.log("❌ Test thất bại: Không nên thành công khi dữ liệu rỗng");
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log("✅ Test thành công: Nhận được lỗi 400 (Validation failed)");
                console.log("📄 Thông báo lỗi:", error.response.data.message);
            } else {
                console.log(
                    "❌ Test thất bại: Nhận được lỗi không mong đợi:",
                    error.response?.status,
                    error.response?.data
                );
            }
        }

        console.log("\n🎉 Hoàn thành test API update sản phẩm!");
        console.log("\n📝 Lưu ý:");
        console.log("- Để test thành công với token thật, bạn cần đăng nhập và lấy JWT token");
        console.log("- Thay TEST_PRODUCT_ID bằng ID sản phẩm thực tế trong database");
        console.log("- Đảm bảo backend đang chạy trên port 5000");
    } catch (error) {
        console.error("❌ Lỗi khi test:", error.message);
        if (error.response) {
            console.error("📄 Response data:", error.response.data);
            console.error("🔢 Status:", error.response.status);
        }
    }
}

// Hàm test với token thật (nếu có)
async function testWithRealToken(token, productId) {
    try {
        console.log("\n🔐 Test với token thật...");

        const response = await axios.put(`${API_BASE_URL}/products/${productId}`, updateData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log("✅ Update thành công!");
        console.log("📄 Response:", response.data);
    } catch (error) {
        console.error("❌ Lỗi khi update với token thật:", error.response?.data || error.message);
    }
}

// Chạy test
if (require.main === module) {
    testUpdateProduct();

    // Nếu có token thật, uncomment dòng dưới
    // const realToken = 'your-jwt-token-here';
    // const realProductId = 'real-product-id-here';
    // testWithRealToken(realToken, realProductId);
}

module.exports = { testUpdateProduct, testWithRealToken };
