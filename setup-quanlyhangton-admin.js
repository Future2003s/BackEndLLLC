const axios = require("axios");

const BASE_URL = "http://localhost:8081/api/v1";

async function createAdminUser() {
    try {
        console.log("👤 Creating admin user...");

        const adminUser = {
            firstName: "Admin",
            lastName: "QuanLyHangTon",
            email: "admin@quanlyhangton.com",
            password: "Admin123!",
            phone: "+84901234567",
            role: "admin"
        };

        const response = await axios.post(`${BASE_URL}/auth/register`, adminUser);
        console.log("✅ Admin user created successfully");
        console.log("User ID:", response.data.data.user._id);
        console.log("Email:", response.data.data.user.email);
        console.log("Token:", response.data.data.token);

        return {
            success: true,
            token: response.data.data.token,
            user: response.data.data.user
        };
    } catch (error) {
        if (error.response?.status === 409) {
            console.log("⚠️ Admin user already exists, trying to login...");

            // Try to login instead
            try {
                const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                    email: "admin@quanlyhangton.com",
                    password: "Admin123!"
                });

                console.log("✅ Login successful");
                return {
                    success: true,
                    token: loginResponse.data.data.token,
                    user: loginResponse.data.data.user
                };
            } catch (loginError) {
                console.error("❌ Login failed:", loginError.response?.data || loginError.message);
                return { success: false };
            }
        } else {
            console.error("❌ Failed to create admin user:", error.response?.data || error.message);
            return { success: false };
        }
    }
}

async function testInventoryAPIs(token) {
    console.log("\n📦 Testing Inventory APIs...");

    try {
        // Test inventory overview
        console.log("Testing inventory overview...");
        const overviewResponse = await axios.get(`${BASE_URL}/inventory/overview`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Inventory overview:", overviewResponse.data.data);
    } catch (error) {
        console.error("❌ Inventory overview failed:", error.response?.data || error.message);
    }

    try {
        // Test low stock products
        console.log("Testing low stock products...");
        const lowStockResponse = await axios.get(`${BASE_URL}/inventory/low-stock?threshold=10`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Low stock products:", lowStockResponse.data.data);
    } catch (error) {
        console.error("❌ Low stock products failed:", error.response?.data || error.message);
    }
}

async function testNotificationAPIs(token) {
    console.log("\n🔔 Testing Notification APIs...");

    try {
        // Test notifications
        console.log("Testing notifications...");
        const notificationsResponse = await axios.get(`${BASE_URL}/notifications?limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Notifications:", notificationsResponse.data.data);
    } catch (error) {
        console.error("❌ Notifications failed:", error.response?.data || error.message);
    }

    try {
        // Test generate system notifications
        console.log("Testing generate system notifications...");
        const generateResponse = await axios.post(
            `${BASE_URL}/notifications/generate`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log("✅ Generate system notifications:", generateResponse.data.data);
    } catch (error) {
        console.error("❌ Generate system notifications failed:", error.response?.data || error.message);
    }
}

async function main() {
    console.log("🚀 Setting up QuanLyHangTon Admin User and Testing APIs...\n");

    // Wait a bit for server to start
    console.log("⏳ Waiting for server to start...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create admin user
    const adminResult = await createAdminUser();
    if (!adminResult.success) {
        console.log("❌ Cannot proceed without admin user");
        return;
    }

    const token = adminResult.token;
    console.log(`\n🔑 Using token: ${token.substring(0, 20)}...`);

    // Test APIs
    await testInventoryAPIs(token);
    await testNotificationAPIs(token);

    console.log("\n✅ Setup and testing completed!");
    console.log("\n📋 Next steps:");
    console.log("1. Update QuanLyHangTon frontend to use these APIs");
    console.log("2. Test the inventory management interface");
    console.log("3. Test the notification system");
}

main().catch(console.error);
