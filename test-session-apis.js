const axios = require("axios");

const BASE_URL = "http://localhost:8081/api/v1";

async function testSessionAPIs() {
    console.log("🚀 Testing Session Management APIs...\n");

    try {
        // Test 1: Register a test user
        console.log("1. Registering test user...");
        const registerResponse = await axios
            .post(`${BASE_URL}/auth/register`, {
                firstName: "Session",
                lastName: "Test",
                email: "session-test@example.com",
                password: "Password123!",
                phone: "+84987654321"
            })
            .catch((err) => {
                // User might already exist
                console.log("   User already exists or registration failed");
                return null;
            });

        if (registerResponse) {
            console.log("   ✅ User registered successfully");
        }

        // Test 2: Login with session tracking
        console.log("\n2. Login with session tracking...");
        const loginResponse = await axios.post(
            `${BASE_URL}/auth/login`,
            {
                email: "session-test@example.com",
                password: "Password123!",
                rememberMe: true,
                deviceInfo: {
                    platform: "test",
                    deviceName: "Test Device"
                }
            },
            {
                headers: {
                    "User-Agent": "SessionTestBot/1.0 (Testing)",
                    "X-Forwarded-For": "127.0.0.1"
                }
            }
        );

        const { token } = loginResponse.data;
        console.log("   ✅ Login successful");
        console.log(`   📱 Token: ${token.substring(0, 20)}...`);

        const authHeaders = {
            Authorization: `Bearer ${token}`,
            "User-Agent": "SessionTestBot/1.0 (Testing)"
        };

        // Test 3: Get user sessions
        console.log("\n3. Getting user sessions...");
        const sessionsResponse = await axios.get(`${BASE_URL}/auth/sessions`, {
            headers: authHeaders
        });

        console.log("   ✅ Sessions retrieved successfully");
        console.log(`   📊 Total sessions: ${sessionsResponse.data.data.totalCount}`);
        console.log(`   🟢 Active sessions: ${sessionsResponse.data.data.activeCount}`);

        const sessions = sessionsResponse.data.data.sessions;
        if (sessions.length > 0) {
            console.log(`   🔧 First session device: ${sessions[0].deviceName}`);
            console.log(`   📍 Location: ${sessions[0].location}`);
        }

        // Test 4: Get session analytics
        console.log("\n4. Getting session analytics...");
        const analyticsResponse = await axios.get(`${BASE_URL}/auth/sessions/analytics`, {
            headers: authHeaders
        });

        console.log("   ✅ Analytics retrieved successfully");
        const analytics = analyticsResponse.data.data;
        console.log(`   📈 Total Sessions: ${analytics.totalSessions}`);
        console.log(`   📊 Device Types:`, analytics.deviceTypes);
        console.log(`   🛡️  Risk Assessment:`, analytics.riskAssessment);

        // Test 5: Get security history
        console.log("\n5. Getting security history...");
        const historyResponse = await axios.get(`${BASE_URL}/auth/sessions/security-history?limit=5`, {
            headers: authHeaders
        });

        console.log("   ✅ Security history retrieved successfully");
        console.log(`   📜 History entries: ${historyResponse.data.data.history.length}`);
        if (historyResponse.data.data.history.length > 0) {
            const latestEvent = historyResponse.data.data.history[0];
            console.log(`   🔐 Latest event: ${latestEvent.eventType} - ${latestEvent.eventDetails.result}`);
        }

        // Test 6: Login from "another device" to create multiple sessions
        console.log("\n6. Creating second session (simulating another device)...");
        const secondLoginResponse = await axios.post(
            `${BASE_URL}/auth/login`,
            {
                email: "session-test@example.com",
                password: "Password123!",
                rememberMe: false,
                deviceInfo: {
                    platform: "test",
                    deviceName: "Another Test Device"
                }
            },
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
                    "X-Forwarded-For": "192.168.1.100"
                }
            }
        );

        const secondToken = secondLoginResponse.data.token;
        console.log("   ✅ Second session created");

        // Test 7: Check sessions again
        console.log("\n7. Checking sessions after second login...");
        const newSessionsResponse = await axios.get(`${BASE_URL}/auth/sessions`, {
            headers: authHeaders
        });

        console.log("   ✅ Updated sessions retrieved");
        console.log(`   📊 Total sessions now: ${newSessionsResponse.data.data.totalCount}`);

        const newSessions = newSessionsResponse.data.data.sessions;

        // Test 8: Terminate a specific session
        if (newSessions.length > 1) {
            const sessionToTerminate = newSessions.find((s) => !s.isCurrentSession);
            if (sessionToTerminate) {
                console.log("\n8. Terminating a specific session...");
                await axios.delete(`${BASE_URL}/auth/sessions/${sessionToTerminate.id}`, {
                    headers: authHeaders
                });
                console.log("   ✅ Session terminated successfully");
            }
        }

        // Test 9: Create more sessions and test bulk termination
        console.log("\n9. Creating multiple sessions for bulk termination test...");

        // Create a few more sessions
        for (let i = 0; i < 2; i++) {
            await axios.post(
                `${BASE_URL}/auth/login`,
                {
                    email: "session-test@example.com",
                    password: "Password123!",
                    deviceInfo: {
                        platform: "test",
                        deviceName: `Bulk Test Device ${i + 1}`
                    }
                },
                {
                    headers: {
                        "User-Agent": `TestDevice${i}/1.0`,
                        "X-Forwarded-For": `192.168.1.${200 + i}`
                    }
                }
            );
        }

        // Test 10: Terminate all other sessions
        console.log("\n10. Terminating all other sessions...");
        const terminateAllResponse = await axios.delete(`${BASE_URL}/auth/sessions/all`, {
            headers: authHeaders
        });

        console.log("   ✅ All other sessions terminated");
        console.log(`   🗑️  Terminated count: ${terminateAllResponse.data.data.terminatedCount}`);

        // Test 11: Final session check
        console.log("\n11. Final session verification...");
        const finalSessionsResponse = await axios.get(`${BASE_URL}/auth/sessions`, {
            headers: authHeaders
        });

        console.log("   ✅ Final sessions check completed");
        console.log(`   📊 Remaining sessions: ${finalSessionsResponse.data.data.totalCount}`);

        console.log("\n🎉 All Session Management API tests completed successfully! 🎉");
    } catch (error) {
        console.error("\n❌ Test failed:", error.response?.data || error.message);
        if (error.response?.data?.stack) {
            console.error("\n📚 Stack trace:", error.response.data.stack);
        }
    }
}

// Run tests
testSessionAPIs();
