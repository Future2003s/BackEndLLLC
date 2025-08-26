const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function simpleTranslationTest() {
    console.log('🌍 Simple Translation API Test');
    console.log('='.repeat(40));

    try {
        // Login first
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@example.com',
            password: 'password123'
        });
        const adminToken = loginResponse.data.data.token;
        console.log('✅ Login successful');

        // Test 1: Try to create translation with controller expected format
        console.log('\n1️⃣ Testing CREATE with controller format...');
        try {
            const testData = {
                key: 'simple.test',
                category: 'ui',
                translations: {
                    vi: 'Test tiếng Việt',
                    en: 'Test English',
                    ja: 'テスト'
                },
                description: 'Simple test translation'
            };
            
            console.log('Request data:', JSON.stringify(testData, null, 2));
            
            const response = await axios.post(`${API_BASE_URL}/translations`, testData, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ CREATE successful');
            console.log('Response:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log('❌ CREATE failed:', error.response?.data?.message || error.message);
            console.log('Error details:', JSON.stringify(error.response?.data, null, 2));
        }

        // Test 2: Try to create translation with validation expected format
        console.log('\n2️⃣ Testing CREATE with validation format...');
        try {
            const testData2 = {
                key: 'simple.test2',
                category: 'ui',
                vi: 'Test tiếng Việt 2',
                en: 'Test English 2',
                ja: 'テスト2',
                description: 'Simple test translation 2'
            };
            
            console.log('Request data:', JSON.stringify(testData2, null, 2));
            
            const response = await axios.post(`${API_BASE_URL}/translations`, testData2, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ CREATE successful');
            console.log('Response:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log('❌ CREATE failed:', error.response?.data?.message || error.message);
            console.log('Error details:', JSON.stringify(error.response?.data, null, 2));
        }

        // Test 3: Get existing translation
        console.log('\n3️⃣ Testing GET existing translation...');
        try {
            const response = await axios.get(`${API_BASE_URL}/translations/key/ui.welcome?lang=vi`);
            console.log('✅ GET successful');
            console.log('Translation:', response.data.data.translation);
        } catch (error) {
            console.log('❌ GET failed:', error.response?.data?.message || error.message);
        }

        // Test 4: Get bulk translations
        console.log('\n4️⃣ Testing GET bulk translations...');
        try {
            const response = await axios.post(`${API_BASE_URL}/translations/bulk?lang=vi`, {
                keys: ['ui.welcome']
            });
            console.log('✅ Bulk GET successful');
            console.log('Translations:', response.data.data.translations);
        } catch (error) {
            console.log('❌ Bulk GET failed:', error.response?.data?.message || error.message);
            console.log('Error details:', JSON.stringify(error.response?.data, null, 2));
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

simpleTranslationTest();
