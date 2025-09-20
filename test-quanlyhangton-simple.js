const axios = require("axios");

const BASE_URL = "http://localhost:8081/api/v1";

async function testBasicAPIs() {
    console.log("🚀 Testing QuanLyHangTon APIs (Basic)...\n");

    try {
        // Test health endpoint
        console.log("Testing health endpoint...");
        const healthResponse = await axios.get(`${BASE_URL.replace("/api/v1", "")}/health`);
        console.log("✅ Health check:", healthResponse.data);
    } catch (error) {
        console.error("❌ Health check failed:", error.message);
    }

    try {
        // Test basic API endpoint
        console.log("\nTesting basic API endpoint...");
        const apiResponse = await axios.get(`${BASE_URL}/test`);
        console.log("✅ API test:", apiResponse.data);
    } catch (error) {
        console.error("❌ API test failed:", error.message);
    }

    try {
        // Test inventory overview (should fail without auth)
        console.log("\nTesting inventory overview (should fail without auth)...");
        const inventoryResponse = await axios.get(`${BASE_URL}/inventory/overview`);
        console.log("✅ Inventory overview:", inventoryResponse.data);
    } catch (error) {
        console.log("⚠️ Inventory overview failed as expected (no auth):", error.response?.status);
    }

    try {
        // Test notifications (should fail without auth)
        console.log("\nTesting notifications (should fail without auth)...");
        const notificationsResponse = await axios.get(`${BASE_URL}/notifications`);
        console.log("✅ Notifications:", notificationsResponse.data);
    } catch (error) {
        console.log("⚠️ Notifications failed as expected (no auth):", error.response?.status);
    }

    console.log("\n✅ Basic API tests completed!");
    console.log("\n📋 Next steps:");
    console.log("1. Install and start MongoDB");
    console.log("2. Create admin user");
    console.log("3. Test full functionality");
}

testBasicAPIs().catch(console.error);
