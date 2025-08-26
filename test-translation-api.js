const axios = require("axios");

const API_BASE_URL = "http://localhost:8081/api/v1";

// Test data
const testTranslation = {
    key: "test.welcome",
    category: "ui",
    translations: {
        vi: "Chào mừng bạn đến với ShopDev",
        en: "Welcome to ShopDev",
        ja: "ShopDevへようこそ"
    },
    description: "Welcome message for users"
};

const bulkTranslations = [
    {
        key: "test.login",
        category: "ui",
        translations: {
            vi: "Đăng nhập",
            en: "Login",
            ja: "ログイン"
        },
        description: "Login button text"
    },
    {
        key: "test.register",
        category: "ui",
        translations: {
            vi: "Đăng ký",
            en: "Register",
            ja: "登録"
        },
        description: "Register button text"
    }
];

const adminUser = {
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: "password123",
    phone: "+84123456789",
    role: "admin"
};

let adminToken = null;
let createdTranslationKey = null;

async function testTranslationAPI() {
    console.log("🌍 Testing Translation API (i18n)");
    console.log("=".repeat(50));

    try {
        // Step 1: Login to get admin token
        console.log("\n1️⃣ Logging in as admin...");
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
            return;
        }

        // Step 2: Test GET translation by key (public) - Vietnamese
        console.log("\n2️⃣ Testing GET translation by key (Vietnamese)...");
        try {
            const response = await axios.get(`${API_BASE_URL}/translations/key/ui.welcome?lang=vi`);
            console.log("✅ GET translation (vi) successful");
            console.log(`Translation: ${response.data.data.translation}`);
        } catch (error) {
            console.log("❌ GET translation (vi) failed:", error.response?.data?.message || error.message);
        }

        // Step 3: Test GET translation by key (public) - English
        console.log("\n3️⃣ Testing GET translation by key (English)...");
        try {
            const response = await axios.get(`${API_BASE_URL}/translations/key/ui.welcome?lang=en`);
            console.log("✅ GET translation (en) successful");
            console.log(`Translation: ${response.data.data.translation}`);
        } catch (error) {
            console.log("❌ GET translation (en) failed:", error.response?.data?.message || error.message);
        }

        // Step 4: Test GET translation by key (public) - Japanese
        console.log("\n4️⃣ Testing GET translation by key (Japanese)...");
        try {
            const response = await axios.get(`${API_BASE_URL}/translations/key/ui.welcome?lang=ja`);
            console.log("✅ GET translation (ja) successful");
            console.log(`Translation: ${response.data.data.translation}`);
        } catch (error) {
            console.log("❌ GET translation (ja) failed:", error.response?.data?.message || error.message);
        }

        // Step 5: Test GET translations by category (public)
        console.log("\n5️⃣ Testing GET translations by category...");
        try {
            const response = await axios.get(`${API_BASE_URL}/translations/category/ui?lang=vi`);
            console.log("✅ GET translations by category successful");
            console.log(`Found ${Object.keys(response.data.data.translations).length} translations`);
        } catch (error) {
            console.log("❌ GET translations by category failed:", error.response?.data?.message || error.message);
        }

        // Step 6: Test GET bulk translations (public)
        console.log("\n6️⃣ Testing GET bulk translations...");
        try {
            const response = await axios.post(`${API_BASE_URL}/translations/bulk?lang=vi`, {
                keys: ["ui.welcome", "ui.login", "ui.register"]
            });
            console.log("✅ GET bulk translations successful");
            console.log(`Translations:`, response.data.data.translations);
        } catch (error) {
            console.log("❌ GET bulk translations failed:", error.response?.data?.message || error.message);
        }

        // Step 7: Test CREATE translation (admin required)
        console.log("\n7️⃣ Testing CREATE translation (admin required)...");
        try {
            const response = await axios.post(`${API_BASE_URL}/translations`, testTranslation, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    "Content-Type": "application/json"
                }
            });
            createdTranslationKey = response.data.data.key;
            console.log("✅ CREATE translation successful");
            console.log(`Translation Key: ${createdTranslationKey}`);
            console.log(`Vietnamese: ${response.data.data.translations.vi}`);
            console.log(`English: ${response.data.data.translations.en}`);
            console.log(`Japanese: ${response.data.data.translations.ja}`);
        } catch (error) {
            console.log("❌ CREATE translation failed:", error.response?.data?.message || error.message);
            if (error.response?.data?.stack) {
                console.log("Stack trace:", error.response.data.stack);
            }
        }

        // Step 8: Test GET created translation
        if (createdTranslationKey) {
            console.log("\n8️⃣ Testing GET created translation...");
            try {
                const response = await axios.get(`${API_BASE_URL}/translations/key/${createdTranslationKey}?lang=vi`);
                console.log("✅ GET created translation successful");
                console.log(`Translation: ${response.data.data.translation}`);
            } catch (error) {
                console.log("❌ GET created translation failed:", error.response?.data?.message || error.message);
            }
        }

        // Step 9: Test UPDATE translation (admin required)
        if (createdTranslationKey) {
            console.log("\n9️⃣ Testing UPDATE translation (admin required)...");
            try {
                const updateData = {
                    translations: {
                        vi: "Chào mừng bạn đến với ShopDev - Cập nhật",
                        en: "Welcome to ShopDev - Updated",
                        ja: "ShopDevへようこそ - 更新"
                    },
                    description: "Updated welcome message"
                };
                const response = await axios.put(`${API_BASE_URL}/translations/${createdTranslationKey}`, updateData, {
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                        "Content-Type": "application/json"
                    }
                });
                console.log("✅ UPDATE translation successful");
                console.log(`Updated Vietnamese: ${response.data.data.translations.vi}`);
            } catch (error) {
                console.log("❌ UPDATE translation failed:", error.response?.data?.message || error.message);
            }
        }

        // Step 10: Test GET paginated translations (admin required)
        console.log("\n🔟 Testing GET paginated translations (admin required)...");
        try {
            const response = await axios.get(`${API_BASE_URL}/translations?page=1&limit=5&category=ui`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            });
            console.log("✅ GET paginated translations successful");
            console.log(`Found ${response.data.data.length} translations`);
        } catch (error) {
            console.log("❌ GET paginated translations failed:", error.response?.data?.message || error.message);
        }

        // Step 11: Test BULK IMPORT translations (admin required)
        console.log("\n1️⃣1️⃣ Testing BULK IMPORT translations (admin required)...");
        try {
            const response = await axios.post(
                `${API_BASE_URL}/translations/bulk-import`,
                {
                    translations: bulkTranslations
                },
                {
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            console.log("✅ BULK IMPORT translations successful");
            console.log(`Created: ${response.data.data.created}, Updated: ${response.data.data.updated}`);
        } catch (error) {
            console.log("❌ BULK IMPORT translations failed:", error.response?.data?.message || error.message);
        }

        // Step 12: Test GET translation stats (admin required)
        console.log("\n1️⃣2️⃣ Testing GET translation stats (admin required)...");
        try {
            const response = await axios.get(`${API_BASE_URL}/translations/stats`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            });
            console.log("✅ GET translation stats successful");
            console.log(`Total translations: ${response.data.data.total.total}`);
            console.log(`Supported languages: ${response.data.data.supportedLanguages.join(", ")}`);
        } catch (error) {
            console.log("❌ GET translation stats failed:", error.response?.data?.message || error.message);
        }

        // Step 13: Test EXPORT translations (admin required)
        console.log("\n1️⃣3️⃣ Testing EXPORT translations (admin required)...");
        try {
            const response = await axios.get(`${API_BASE_URL}/translations/export?category=ui&language=vi`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            });
            console.log("✅ EXPORT translations successful");
            console.log(`Export format: ${typeof response.data.data}`);
        } catch (error) {
            console.log("❌ EXPORT translations failed:", error.response?.data?.message || error.message);
        }

        // Step 14: Test DELETE translation (admin required)
        if (createdTranslationKey) {
            console.log("\n1️⃣4️⃣ Testing DELETE translation (admin required)...");
            try {
                await axios.delete(`${API_BASE_URL}/translations/${createdTranslationKey}`, {
                    headers: {
                        Authorization: `Bearer ${adminToken}`
                    }
                });
                console.log("✅ DELETE translation successful");
            } catch (error) {
                console.log("❌ DELETE translation failed:", error.response?.data?.message || error.message);
            }
        }

        // Step 15: Test language validation
        console.log("\n1️⃣5️⃣ Testing language validation...");
        try {
            await axios.get(`${API_BASE_URL}/translations/key/ui.welcome?lang=invalid`);
            console.log("❌ Should have failed with invalid language");
        } catch (error) {
            if (error.response?.status === 400) {
                console.log("✅ Correctly rejected invalid language");
            } else {
                console.log("❌ Unexpected error:", error.response?.data?.message || error.message);
            }
        }

        // Step 16: Test unauthorized access
        console.log("\n1️⃣6️⃣ Testing unauthorized access...");
        try {
            await axios.post(`${API_BASE_URL}/translations`, testTranslation);
            console.log("❌ Should have failed without token");
        } catch (error) {
            if (error.response?.status === 401) {
                console.log("✅ Correctly rejected unauthorized request");
            } else {
                console.log("❌ Unexpected error:", error.response?.data?.message || error.message);
            }
        }

        console.log("\n🎉 Translation API testing completed!");
    } catch (error) {
        console.log("❌ Test failed:", error.message);
    }
}

// Run the test
testTranslationAPI();
