const axios = require("axios");

const API_BASE_URL = "http://localhost:8081/api/v1";

// Test data
const testBrand = {
    name: "Nike Test",
    description: "Thương hiệu thể thao hàng đầu thế giới",
    logo: "https://example.com/nike-logo.png",
    website: "https://nike.com",
    isActive: true,
    seo: {
        title: "Nike - Thương hiệu thể thao",
        description: "Sản phẩm Nike chính hãng",
        keywords: ["nike", "thể thao", "giày"]
    }
};

const adminUser = {
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: "password123",
    phone: "+84123456789",
    role: "admin"
};

let adminToken = null;
let createdBrandId = null;

async function testBrandAPI() {
    console.log("🏷️ Testing Brand API");
    console.log("=".repeat(50));

    try {
        // Step 1: Create admin user (if not exists)
        console.log("\n1️⃣ Creating admin user...");
        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, adminUser);
            console.log("✅ Admin user created successfully");
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.message?.includes("already exists")) {
                console.log("ℹ️ Admin user already exists");
            } else {
                console.log("❌ Failed to create admin user:", error.response?.data?.message || error.message);
                console.log("Full error:", JSON.stringify(error.response?.data, null, 2));
            }
        }

        // Step 2: Login to get admin token
        console.log("\n2️⃣ Logging in as admin...");
        try {
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: adminUser.email,
                password: adminUser.password
            });
            adminToken = loginResponse.data.data.token;
            console.log("✅ Admin login successful");
            console.log(`Token: ${adminToken.substring(0, 20)}...`);
        } catch (error) {
            console.log("❌ Admin login failed:", error.response?.data?.message || error.message);
            console.log("Full login error:", JSON.stringify(error.response?.data, null, 2));
            return;
        }

        // Step 3: Test GET brands (public)
        console.log("\n3️⃣ Testing GET brands (public)...");
        try {
            const response = await axios.get(`${API_BASE_URL}/brands`);
            console.log("✅ GET brands successful");
            console.log(`Found ${response.data.data?.length || 0} brands`);
        } catch (error) {
            console.log("❌ GET brands failed:", error.response?.data?.message || error.message);
        }

        // Step 4: Test CREATE brand (admin required)
        console.log("\n4️⃣ Testing CREATE brand (admin required)...");
        try {
            const response = await axios.post(`${API_BASE_URL}/brands`, testBrand, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    "Content-Type": "application/json"
                }
            });
            createdBrandId = response.data.data._id;
            console.log("✅ CREATE brand successful");
            console.log(`Brand ID: ${createdBrandId}`);
            console.log(`Brand Name: ${response.data.data.name}`);
            console.log(`Brand Slug: ${response.data.data.slug}`);
        } catch (error) {
            console.log("❌ CREATE brand failed:", error.response?.data?.message || error.message);
            if (error.response?.data?.stack) {
                console.log("Stack trace:", error.response.data.stack);
            }
        }

        // Step 5: Test GET single brand
        if (createdBrandId) {
            console.log("\n5️⃣ Testing GET single brand...");
            try {
                const response = await axios.get(`${API_BASE_URL}/brands/${createdBrandId}`);
                console.log("✅ GET single brand successful");
                console.log(`Brand: ${response.data.data.name}`);
            } catch (error) {
                console.log("❌ GET single brand failed:", error.response?.data?.message || error.message);
            }
        }

        // Step 6: Test UPDATE brand (admin required)
        if (createdBrandId) {
            console.log("\n6️⃣ Testing UPDATE brand (admin required)...");
            try {
                const updateData = {
                    name: "Nike Updated",
                    description: "Mô tả đã được cập nhật"
                };
                const response = await axios.put(`${API_BASE_URL}/brands/${createdBrandId}`, updateData, {
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                        "Content-Type": "application/json"
                    }
                });
                console.log("✅ UPDATE brand successful");
                console.log(`Updated Name: ${response.data.data.name}`);
                console.log(`Updated Slug: ${response.data.data.slug}`);
            } catch (error) {
                console.log("❌ UPDATE brand failed:", error.response?.data?.message || error.message);
            }
        }

        // Step 7: Test DELETE brand (admin required)
        if (createdBrandId) {
            console.log("\n7️⃣ Testing DELETE brand (admin required)...");
            try {
                await axios.delete(`${API_BASE_URL}/brands/${createdBrandId}`, {
                    headers: {
                        Authorization: `Bearer ${adminToken}`
                    }
                });
                console.log("✅ DELETE brand successful");
            } catch (error) {
                console.log("❌ DELETE brand failed:", error.response?.data?.message || error.message);
            }
        }

        // Step 8: Test unauthorized access
        console.log("\n8️⃣ Testing unauthorized access...");
        try {
            await axios.post(`${API_BASE_URL}/brands`, testBrand);
            console.log("❌ Should have failed without token");
        } catch (error) {
            if (error.response?.status === 401) {
                console.log("✅ Correctly rejected unauthorized request");
            } else {
                console.log("❌ Unexpected error:", error.response?.data?.message || error.message);
            }
        }

        console.log("\n🎉 Brand API testing completed!");
    } catch (error) {
        console.log("❌ Test failed:", error.message);
    }
}

// Run the test
testBrandAPI();
