const axios = require("axios");

const BASE_URL = "http://localhost:8081/api/v1";
let authToken = "";

// Test data
const testUser = {
    email: "admin@quanlyhangton.com",
    password: "Admin123!"
};

const testProduct = {
    name: "Test Product for Inventory",
    sku: "TEST-INV-001",
    price: 100000,
    stock: 50,
    description: "Test product for inventory management",
    category: "Test Category",
    brand: "Test Brand"
};

async function login() {
    try {
        console.log("🔐 Logging in...");
        const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
        authToken = response.data.data.token;
        console.log("✅ Login successful");
        return true;
    } catch (error) {
        console.error("❌ Login failed:", error.response?.data || error.message);
        return false;
    }
}

async function testInventoryAPIs() {
    console.log("\n📦 Testing Inventory APIs...");

    try {
        // Test inventory overview
        console.log("Testing inventory overview...");
        const overviewResponse = await axios.get(`${BASE_URL}/inventory/overview`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Inventory overview:", overviewResponse.data.data);
    } catch (error) {
        console.error("❌ Inventory overview failed:", error.response?.data || error.message);
    }

    try {
        // Test low stock products
        console.log("Testing low stock products...");
        const lowStockResponse = await axios.get(`${BASE_URL}/inventory/low-stock?threshold=10`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Low stock products:", lowStockResponse.data.data);
    } catch (error) {
        console.error("❌ Low stock products failed:", error.response?.data || error.message);
    }

    try {
        // Test inventory products
        console.log("Testing inventory products...");
        const productsResponse = await axios.get(`${BASE_URL}/inventory/products?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Inventory products:", productsResponse.data.data);
    } catch (error) {
        console.error("❌ Inventory products failed:", error.response?.data || error.message);
    }

    try {
        // Test inventory analytics
        console.log("Testing inventory analytics...");
        const analyticsResponse = await axios.get(`${BASE_URL}/inventory/analytics?period=30d`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Inventory analytics:", analyticsResponse.data.data);
    } catch (error) {
        console.error("❌ Inventory analytics failed:", error.response?.data || error.message);
    }
}

async function testImportExportAPIs() {
    console.log("\n📥 Testing Import/Export APIs...");

    try {
        // Test import records
        console.log("Testing import records...");
        const importsResponse = await axios.get(`${BASE_URL}/import-export/imports?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Import records:", importsResponse.data.data);
    } catch (error) {
        console.error("❌ Import records failed:", error.response?.data || error.message);
    }

    try {
        // Test export records
        console.log("Testing export records...");
        const exportsResponse = await axios.get(`${BASE_URL}/import-export/exports?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Export records:", exportsResponse.data.data);
    } catch (error) {
        console.error("❌ Export records failed:", error.response?.data || error.message);
    }

    try {
        // Test import/export summary
        console.log("Testing import/export summary...");
        const summaryResponse = await axios.get(`${BASE_URL}/import-export/summary?period=30d`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Import/Export summary:", summaryResponse.data.data);
    } catch (error) {
        console.error("❌ Import/Export summary failed:", error.response?.data || error.message);
    }

    try {
        // Test create import record
        console.log("Testing create import record...");
        const createImportResponse = await axios.post(
            `${BASE_URL}/import-export/imports`,
            {
                supplier: "Test Supplier",
                items: [
                    {
                        productId: "test_product_id",
                        quantity: 10,
                        unitPrice: 50000
                    }
                ],
                notes: "Test import record",
                importDate: new Date().toISOString().split("T")[0]
            },
            {
                headers: { Authorization: `Bearer ${authToken}` }
            }
        );
        console.log("✅ Create import record:", createImportResponse.data.data);
    } catch (error) {
        console.error("❌ Create import record failed:", error.response?.data || error.message);
    }
}

async function testNotificationAPIs() {
    console.log("\n🔔 Testing Notification APIs...");

    try {
        // Test notifications
        console.log("Testing notifications...");
        const notificationsResponse = await axios.get(`${BASE_URL}/notifications?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Notifications:", notificationsResponse.data.data);
    } catch (error) {
        console.error("❌ Notifications failed:", error.response?.data || error.message);
    }

    try {
        // Test notification summary
        console.log("Testing notification summary...");
        const summaryResponse = await axios.get(`${BASE_URL}/notifications/summary`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Notification summary:", summaryResponse.data.data);
    } catch (error) {
        console.error("❌ Notification summary failed:", error.response?.data || error.message);
    }

    try {
        // Test notification types
        console.log("Testing notification types...");
        const typesResponse = await axios.get(`${BASE_URL}/notifications/types`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Notification types:", typesResponse.data.data);
    } catch (error) {
        console.error("❌ Notification types failed:", error.response?.data || error.message);
    }

    try {
        // Test generate system notifications
        console.log("Testing generate system notifications...");
        const generateResponse = await axios.post(
            `${BASE_URL}/notifications/generate`,
            {},
            {
                headers: { Authorization: `Bearer ${authToken}` }
            }
        );
        console.log("✅ Generate system notifications:", generateResponse.data.data);
    } catch (error) {
        console.error("❌ Generate system notifications failed:", error.response?.data || error.message);
    }
}

async function testStockUpdate() {
    console.log("\n📊 Testing Stock Update...");

    try {
        // First, get a product to update
        const productsResponse = await axios.get(`${BASE_URL}/products?limit=1`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (productsResponse.data.data.products.length > 0) {
            const product = productsResponse.data.data.products[0];
            console.log(`Testing stock update for product: ${product.name}`);

            // Test stock update
            const updateResponse = await axios.put(
                `${BASE_URL}/inventory/stock/${product._id}`,
                {
                    stock: 100,
                    operation: "set"
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );
            console.log("✅ Stock update:", updateResponse.data.data);
        } else {
            console.log("⚠️ No products found to test stock update");
        }
    } catch (error) {
        console.error("❌ Stock update failed:", error.response?.data || error.message);
    }
}

async function runAllTests() {
    console.log("🚀 Starting QuanLyHangTon API Tests...\n");

    // Login first
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log("❌ Cannot proceed without authentication");
        return;
    }

    // Run all tests
    await testInventoryAPIs();
    await testImportExportAPIs();
    await testNotificationAPIs();
    await testStockUpdate();

    console.log("\n✅ All tests completed!");
}

// Run tests
runAllTests().catch(console.error);
