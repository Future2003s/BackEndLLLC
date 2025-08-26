const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

// Test data
const testCategory = {
    name: 'Điện tử',
    description: 'Danh mục sản phẩm điện tử và công nghệ',
    image: 'https://example.com/electronics.jpg',
    icon: 'fas fa-laptop',
    isActive: true,
    sortOrder: 1,
    seo: {
        title: 'Điện tử - Công nghệ',
        description: 'Sản phẩm điện tử và công nghệ cao',
        keywords: ['điện tử', 'công nghệ', 'laptop', 'điện thoại']
    }
};

const testSubCategory = {
    name: 'Điện thoại',
    description: 'Điện thoại thông minh và phụ kiện',
    image: 'https://example.com/phones.jpg',
    icon: 'fas fa-mobile-alt',
    isActive: true,
    sortOrder: 1,
    seo: {
        title: 'Điện thoại thông minh',
        description: 'Điện thoại iPhone, Samsung, Xiaomi',
        keywords: ['điện thoại', 'smartphone', 'iphone', 'samsung']
    }
};

const adminUser = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'password123',
    phone: '+84123456789',
    role: 'admin'
};

let adminToken = null;
let parentCategoryId = null;
let childCategoryId = null;

async function testCategoryAPI() {
    console.log('📂 Testing Category API');
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

        // Step 2: Test GET categories (public)
        console.log('\n2️⃣ Testing GET categories (public)...');
        try {
            const response = await axios.get(`${API_BASE_URL}/categories`);
            console.log('✅ GET categories successful');
            console.log(`Found ${response.data.data?.length || 0} categories`);
        } catch (error) {
            console.log('❌ GET categories failed:', error.response?.data?.message || error.message);
        }

        // Step 3: Test GET category tree (public)
        console.log('\n3️⃣ Testing GET category tree (public)...');
        try {
            const response = await axios.get(`${API_BASE_URL}/categories/tree`);
            console.log('✅ GET category tree successful');
            console.log(`Tree structure: ${JSON.stringify(response.data.data, null, 2).substring(0, 200)}...`);
        } catch (error) {
            console.log('❌ GET category tree failed:', error.response?.data?.message || error.message);
        }

        // Step 4: Test CREATE parent category (admin required)
        console.log('\n4️⃣ Testing CREATE parent category (admin required)...');
        try {
            const response = await axios.post(`${API_BASE_URL}/categories`, testCategory, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });
            parentCategoryId = response.data.data._id;
            console.log('✅ CREATE parent category successful');
            console.log(`Category ID: ${parentCategoryId}`);
            console.log(`Category Name: ${response.data.data.name}`);
            console.log(`Category Slug: ${response.data.data.slug}`);
        } catch (error) {
            console.log('❌ CREATE parent category failed:', error.response?.data?.message || error.message);
            if (error.response?.data?.stack) {
                console.log('Stack trace:', error.response.data.stack);
            }
        }

        // Step 5: Test CREATE child category (admin required)
        if (parentCategoryId) {
            console.log('\n5️⃣ Testing CREATE child category (admin required)...');
            try {
                const childCategoryData = {
                    ...testSubCategory,
                    parent: parentCategoryId
                };
                const response = await axios.post(`${API_BASE_URL}/categories`, childCategoryData, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                childCategoryId = response.data.data._id;
                console.log('✅ CREATE child category successful');
                console.log(`Child Category ID: ${childCategoryId}`);
                console.log(`Child Category Name: ${response.data.data.name}`);
                console.log(`Parent: ${response.data.data.parent?.name || 'None'}`);
            } catch (error) {
                console.log('❌ CREATE child category failed:', error.response?.data?.message || error.message);
            }
        }

        // Step 6: Test GET single category
        if (parentCategoryId) {
            console.log('\n6️⃣ Testing GET single category...');
            try {
                const response = await axios.get(`${API_BASE_URL}/categories/${parentCategoryId}`);
                console.log('✅ GET single category successful');
                console.log(`Category: ${response.data.data.name}`);
            } catch (error) {
                console.log('❌ GET single category failed:', error.response?.data?.message || error.message);
            }
        }

        // Step 7: Test GET categories with parent filter
        if (parentCategoryId) {
            console.log('\n7️⃣ Testing GET categories with parent filter...');
            try {
                const response = await axios.get(`${API_BASE_URL}/categories?parent=${parentCategoryId}`);
                console.log('✅ GET categories with parent filter successful');
                console.log(`Found ${response.data.data?.length || 0} child categories`);
            } catch (error) {
                console.log('❌ GET categories with parent filter failed:', error.response?.data?.message || error.message);
            }
        }

        // Step 8: Test UPDATE category (admin required)
        if (parentCategoryId) {
            console.log('\n8️⃣ Testing UPDATE category (admin required)...');
            try {
                const updateData = {
                    name: 'Điện tử & Công nghệ',
                    description: 'Danh mục sản phẩm điện tử và công nghệ cao cấp'
                };
                const response = await axios.put(`${API_BASE_URL}/categories/${parentCategoryId}`, updateData, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('✅ UPDATE category successful');
                console.log(`Updated Name: ${response.data.data.name}`);
            } catch (error) {
                console.log('❌ UPDATE category failed:', error.response?.data?.message || error.message);
            }
        }

        // Step 9: Test DELETE child category first (admin required)
        if (childCategoryId) {
            console.log('\n9️⃣ Testing DELETE child category (admin required)...');
            try {
                await axios.delete(`${API_BASE_URL}/categories/${childCategoryId}`, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                console.log('✅ DELETE child category successful');
            } catch (error) {
                console.log('❌ DELETE child category failed:', error.response?.data?.message || error.message);
            }
        }

        // Step 10: Test DELETE parent category (admin required)
        if (parentCategoryId) {
            console.log('\n🔟 Testing DELETE parent category (admin required)...');
            try {
                await axios.delete(`${API_BASE_URL}/categories/${parentCategoryId}`, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                console.log('✅ DELETE parent category successful');
            } catch (error) {
                console.log('❌ DELETE parent category failed:', error.response?.data?.message || error.message);
            }
        }

        // Step 11: Test unauthorized access
        console.log('\n1️⃣1️⃣ Testing unauthorized access...');
        try {
            await axios.post(`${API_BASE_URL}/categories`, testCategory);
            console.log('❌ Should have failed without token');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Correctly rejected unauthorized request');
            } else {
                console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
            }
        }

        console.log('\n🎉 Category API testing completed!');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testCategoryAPI();
