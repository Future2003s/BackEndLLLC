const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

const adminUser = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'password123',
    phone: '+84123456789',
    role: 'admin'
};

let adminToken = null;

async function testRevenueAnalytics() {
    console.log('💰 Testing Revenue Analytics API');
    console.log('='.repeat(50));

    try {
        // Step 1: Login to get admin token
        console.log('\n1️⃣ Logging in as admin...');
        try {
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: adminUser.email,
                password: adminUser.password
            });
            adminToken = loginResponse.data.data.token;
            console.log('✅ Admin login successful');
            console.log(`Token: ${adminToken.substring(0, 20)}...`);
        } catch (error) {
            console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
            return;
        }

        // Step 2: Test GET revenue analytics by month (current year)
        console.log('\n2️⃣ Testing GET revenue analytics by month (current year)...');
        try {
            const response = await axios.get(`${API_BASE_URL}/analytics/revenue?groupBy=month&year=2024`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ GET revenue by month successful');
            console.log(`Total Revenue: $${response.data.data.summary.totalRevenue}`);
            console.log(`Total Orders: ${response.data.data.summary.totalOrders}`);
            console.log(`Average Order Value: $${response.data.data.summary.averageOrderValue}`);
            console.log(`Periods with Sales: ${response.data.data.summary.periodsWithSales}`);
            
            if (response.data.data.data.length > 0) {
                console.log('\nSample monthly data:');
                response.data.data.data.slice(0, 3).forEach(item => {
                    console.log(`  ${item.period}: $${item.revenue} (${item.orders} orders)`);
                });
            }
        } catch (error) {
            console.log('❌ GET revenue by month failed:', error.response?.data?.message || error.message);
        }

        // Step 3: Test GET revenue analytics by day (last 30 days)
        console.log('\n3️⃣ Testing GET revenue analytics by day (last 30 days)...');
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            
            const response = await axios.get(`${API_BASE_URL}/analytics/revenue`, {
                params: {
                    groupBy: 'day',
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                },
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ GET revenue by day successful');
            console.log(`Total Revenue (30 days): $${response.data.data.summary.totalRevenue}`);
            console.log(`Total Orders (30 days): ${response.data.data.summary.totalOrders}`);
            console.log(`Days with Sales: ${response.data.data.summary.periodsWithSales}`);
        } catch (error) {
            console.log('❌ GET revenue by day failed:', error.response?.data?.message || error.message);
        }

        // Step 4: Test GET revenue analytics for specific date range
        console.log('\n4️⃣ Testing GET revenue analytics for specific date range...');
        try {
            const response = await axios.get(`${API_BASE_URL}/analytics/revenue`, {
                params: {
                    groupBy: 'month',
                    startDate: '2024-01-01',
                    endDate: '2024-12-31'
                },
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ GET revenue by date range successful');
            console.log(`Total Revenue (2024): $${response.data.data.summary.totalRevenue}`);
            console.log(`Total Orders (2024): ${response.data.data.summary.totalOrders}`);
        } catch (error) {
            console.log('❌ GET revenue by date range failed:', error.response?.data?.message || error.message);
        }

        // Step 5: Test GET top selling products by revenue
        console.log('\n5️⃣ Testing GET top selling products by revenue...');
        try {
            const response = await axios.get(`${API_BASE_URL}/analytics/products/top-selling?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ GET top selling products successful');
            console.log(`Found ${response.data.data.products.length} top selling products`);
            
            if (response.data.data.products.length > 0) {
                console.log('\nTop selling products:');
                response.data.data.products.forEach((product, index) => {
                    console.log(`  ${index + 1}. ${product.productName}: $${product.totalRevenue} (${product.totalQuantitySold} sold)`);
                });
            }
        } catch (error) {
            console.log('❌ GET top selling products failed:', error.response?.data?.message || error.message);
        }

        // Step 6: Test GET top selling products with date filter
        console.log('\n6️⃣ Testing GET top selling products with date filter...');
        try {
            const response = await axios.get(`${API_BASE_URL}/analytics/products/top-selling`, {
                params: {
                    limit: 3,
                    startDate: '2024-01-01',
                    endDate: '2024-12-31'
                },
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ GET top selling products with date filter successful');
            console.log(`Found ${response.data.data.products.length} products for 2024`);
        } catch (error) {
            console.log('❌ GET top selling products with date filter failed:', error.response?.data?.message || error.message);
        }

        // Step 7: Test GET dashboard analytics (existing)
        console.log('\n7️⃣ Testing GET dashboard analytics...');
        try {
            const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ GET dashboard analytics successful');
            console.log(`Total Products: ${response.data.data.overview.totalProducts}`);
            console.log(`Total Users: ${response.data.data.overview.totalUsers}`);
            console.log(`Total Orders: ${response.data.data.overview.totalOrders}`);
        } catch (error) {
            console.log('❌ GET dashboard analytics failed:', error.response?.data?.message || error.message);
        }

        // Step 8: Test GET conversion funnel
        console.log('\n8️⃣ Testing GET conversion funnel...');
        try {
            const response = await axios.get(`${API_BASE_URL}/analytics/funnel`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ GET conversion funnel successful');
            console.log(`Overall Conversion Rate: ${response.data.data.conversionRates.overall}%`);
        } catch (error) {
            console.log('❌ GET conversion funnel failed:', error.response?.data?.message || error.message);
        }

        // Step 9: Test unauthorized access
        console.log('\n9️⃣ Testing unauthorized access...');
        try {
            await axios.get(`${API_BASE_URL}/analytics/revenue`);
            console.log('❌ Should have failed without token');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Correctly rejected unauthorized request');
            } else {
                console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
            }
        }

        // Step 10: Test invalid date range
        console.log('\n🔟 Testing invalid date range...');
        try {
            await axios.get(`${API_BASE_URL}/analytics/revenue?startDate=invalid-date`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('❌ Should have failed with invalid date');
        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 500) {
                console.log('✅ Correctly handled invalid date');
            } else {
                console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
            }
        }

        console.log('\n🎉 Revenue Analytics API testing completed!');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testRevenueAnalytics();
