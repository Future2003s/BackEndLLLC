const axios = require("axios");

const BASE_URL = "http://localhost:8081/api/v1";

async function runSimpleTest() {
    console.log("🧪 Simple Session API Test\n");

    try {
        // 1. Login to get token
        console.log("1. Logging in...");
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: "session-test@example.com",
            password: "Password123!"
        });

        const { token } = loginResponse.data.data;
        console.log("   ✅ Login successful");

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Test GET /sessions
        console.log("\n2. Testing GET /sessions...");
        const sessionsResponse = await axios.get(`${BASE_URL}/auth/sessions`, { headers });
        console.log("   ✅ Sessions endpoint working");
        console.log("   📊 Data:", sessionsResponse.data.data);

        // 3. Test GET /sessions/analytics
        console.log("\n3. Testing GET /sessions/analytics...");
        const analyticsResponse = await axios.get(`${BASE_URL}/auth/sessions/analytics`, { headers });
        console.log("   ✅ Analytics endpoint working");
        console.log("   📈 Data:", analyticsResponse.data.data);

        // 4. Test GET /sessions/security-history
        console.log("\n4. Testing GET /sessions/security-history...");
        const historyResponse = await axios.get(`${BASE_URL}/auth/sessions/security-history`, { headers });
        console.log("   ✅ Security history endpoint working");
        console.log("   📜 Data:", historyResponse.data.data);

        // 5. Test DELETE /sessions/all (should not terminate any since no sessions)
        console.log("\n5. Testing DELETE /sessions/all...");
        const terminateAllResponse = await axios.delete(`${BASE_URL}/auth/sessions/all`, { headers });
        console.log("   ✅ Terminate all endpoint working");
        console.log("   🗑️ Data:", terminateAllResponse.data.data);

        console.log("\n🎉 All basic session endpoints are working! 🎉");
        console.log("📝 Note: Sessions are empty because login is not creating sessions yet.");
        console.log("🔧 Next step: Implement session creation in login flow.");
    } catch (error) {
        console.error("\n❌ Test failed:", error.response?.data || error.message);
    }
}

runSimpleTest();
