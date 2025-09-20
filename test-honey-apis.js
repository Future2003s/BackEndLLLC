const fetch = require("node-fetch");

const API_BASE = "http://localhost:8081/api/v1";

// Test data
const testUser = {
    email: "admin@honey.com",
    password: "admin123"
};

let authToken = "";

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        console.log(`\n📡 ${options.method || "GET"} ${endpoint}`);
        console.log(`Status: ${response.status}`);

        if (response.ok) {
            console.log("✅ Success:", JSON.stringify(data, null, 2));
        } else {
            console.log("❌ Error:", JSON.stringify(data, null, 2));
        }

        return { success: response.ok, data, status: response.status };
    } catch (error) {
        console.log(`❌ Network Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Test authentication
async function testAuth() {
    console.log("🔐 Testing Authentication...");

    const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(testUser)
    });

    if (result.success && result.data.token) {
        authToken = result.data.token;
        console.log("✅ Authentication successful!");
        return true;
    } else {
        console.log("❌ Authentication failed!");
        return false;
    }
}

// Test honey categories
async function testHoneyCategories() {
    console.log("\n🍯 Testing Honey Categories...");

    const result = await apiRequest("/categories");
    if (result.success) {
        const honeyCategories = result.data.filter(
            (cat) => cat.name.toLowerCase().includes("mật ong") || cat.name.toLowerCase().includes("honey")
        );
        console.log(`Found ${honeyCategories.length} honey categories:`);
        honeyCategories.forEach((cat) => {
            console.log(`  - ${cat.name} (${cat.slug})`);
        });
    }
    return result;
}

// Test honey brands
async function testHoneyBrands() {
    console.log("\n🏷️ Testing Honey Brands...");

    const result = await apiRequest("/brands");
    if (result.success) {
        const honeyBrands = result.data.filter(
            (brand) =>
                brand.name.toLowerCase().includes("honey") ||
                brand.name.toLowerCase().includes("bee") ||
                brand.name.toLowerCase().includes("golden")
        );
        console.log(`Found ${honeyBrands.length} honey brands:`);
        honeyBrands.forEach((brand) => {
            console.log(`  - ${brand.name} (${brand.slug})`);
        });
    }
    return result;
}

// Test honey products
async function testHoneyProducts() {
    console.log("\n🍯 Testing Honey Products...");

    const result = await apiRequest("/products");
    if (result.success) {
        const honeyProducts = result.data.filter(
            (product) =>
                product.name.toLowerCase().includes("mật ong") ||
                product.tags?.some((tag) => tag.toLowerCase().includes("honey")) ||
                product.category?.name?.toLowerCase().includes("mật ong")
        );
        console.log(`Found ${honeyProducts.length} honey products:`);
        honeyProducts.forEach((product) => {
            console.log(`  - ${product.name}`);
            console.log(`    SKU: ${product.sku}`);
            console.log(`    Price: ${product.price.toLocaleString("vi-VN")} VNĐ`);
            console.log(`    Stock: ${product.quantity}`);
            console.log(`    Honey Type: ${product.honeyType || "N/A"}`);
            console.log(`    Purity: ${product.purity || "N/A"}%`);
            console.log(`    Weight: ${product.weight || "N/A"}g`);
            console.log("    ---");
        });
    }
    return result;
}

// Test creating a new honey product
async function testCreateHoneyProduct() {
    console.log("\n➕ Testing Create Honey Product...");

    // First get categories and brands
    const categoriesResult = await apiRequest("/categories");
    const brandsResult = await apiRequest("/brands");

    if (!categoriesResult.success || !brandsResult.success) {
        console.log("❌ Failed to get categories or brands");
        return;
    }

    const honeyCategory = categoriesResult.data.find((cat) => cat.name.toLowerCase().includes("mật ong"));
    const honeyBrand = brandsResult.data.find((brand) => brand.name.toLowerCase().includes("honey"));

    if (!honeyCategory || !honeyBrand) {
        console.log("❌ No honey category or brand found");
        return;
    }

    const newHoneyProduct = {
        name: "Mật ong hoa cúc nguyên chất 300g",
        description: "Mật ong hoa cúc nguyên chất 100%, thu hoạch từ vùng Đà Lạt. Vị ngọt thanh, hương thơm dịu nhẹ.",
        price: 120000,
        originalPrice: 150000,
        sku: "HONEY-CUC-300G",
        quantity: 25,
        minStock: 8,
        maxStock: 50,
        categoryId: honeyCategory._id,
        brandId: honeyBrand._id,
        honeyType: "wildflower",
        purity: 92,
        weight: 300,
        harvestDate: new Date("2024-06-01").toISOString().split("T")[0],
        expiryDate: new Date("2026-06-01").toISOString().split("T")[0],
        images: [
            {
                url: "https://via.placeholder.com/400x400/FFD700/000000?text=Mật+Ong+Hoa+Cúc",
                alt: "Mật ong hoa cúc 300g",
                isPrimary: true,
                order: 1
            }
        ],
        tags: ["mật ong", "hoa cúc", "nguyên chất", "đà lạt"],
        isActive: true,
        isFeatured: false
    };

    const result = await apiRequest("/products", {
        method: "POST",
        body: JSON.stringify(newHoneyProduct)
    });

    if (result.success) {
        console.log("✅ Honey product created successfully!");
        console.log(`Product ID: ${result.data._id}`);
    }

    return result;
}

// Test updating honey product stock
async function testUpdateHoneyStock() {
    console.log("\n📦 Testing Update Honey Stock...");

    // First get honey products
    const productsResult = await apiRequest("/products");
    if (!productsResult.success) {
        console.log("❌ Failed to get products");
        return;
    }

    const honeyProduct = productsResult.data.find((product) => product.name.toLowerCase().includes("mật ong"));

    if (!honeyProduct) {
        console.log("❌ No honey product found");
        return;
    }

    const updateData = {
        quantity: honeyProduct.quantity + 10,
        operation: "add",
        reason: "Nhập thêm hàng từ nhà cung cấp"
    };

    const result = await apiRequest(`/products/${honeyProduct._id}/stock`, {
        method: "PATCH",
        body: JSON.stringify(updateData)
    });

    if (result.success) {
        console.log("✅ Honey product stock updated successfully!");
        console.log(`New stock: ${result.data.quantity}`);
    }

    return result;
}

// Test honey product analytics
async function testHoneyAnalytics() {
    console.log("\n📊 Testing Honey Analytics...");

    const result = await apiRequest("/analytics/dashboard");
    if (result.success) {
        console.log("✅ Analytics data retrieved successfully!");
        console.log("Dashboard Analytics:", JSON.stringify(result.data, null, 2));
    }

    return result;
}

// Main test function
async function runTests() {
    console.log("🍯 Starting Honey Management API Tests...\n");

    try {
        // Test authentication
        const authSuccess = await testAuth();
        if (!authSuccess) {
            console.log("❌ Authentication failed. Stopping tests.");
            return;
        }

        // Test honey categories
        await testHoneyCategories();

        // Test honey brands
        await testHoneyBrands();

        // Test honey products
        await testHoneyProducts();

        // Test creating new honey product
        await testCreateHoneyProduct();

        // Test updating honey stock
        await testUpdateHoneyStock();

        // Test analytics
        await testHoneyAnalytics();

        console.log("\n✅ All honey management tests completed!");
    } catch (error) {
        console.error("❌ Test error:", error);
    }
}

// Run tests
runTests();
