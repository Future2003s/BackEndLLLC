const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8081/api/v1';

// Simple test to check if server is running
async function checkServerHealth() {
    try {
        const response = await axios.get(`${BASE_URL}/performance/health`);
        console.log('✓ Server is running');
        return true;
    } catch (error) {
        console.log('✗ Server is not responding');
        console.log('Error:', error.message);
        return false;
    }
}

// Test registration and login
async function testAuthFlow() {
    console.log('\n--- Testing Auth Flow ---');
    
    // Test user data
    const testUser = {
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: 'TestAdmin123!',
        phone: '+84987654321',
        role: 'admin'
    };

    try {
        // Try to register
        console.log('Attempting registration...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, testUser);
            console.log('✓ Registration successful');
        } catch (regError) {
            if (regError.response?.status === 400 && regError.response?.data?.message?.includes('already exists')) {
                console.log('✓ User already exists, proceeding to login');
            } else {
                throw regError;
            }
        }

        // Try to login
        console.log('Attempting login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });

        console.log('✓ Login successful');
        return loginResponse.data.token;

    } catch (error) {
        console.log('✗ Auth flow failed:', error.response?.data?.message || error.message);
        return null;
    }
}

// Create a test product
async function createTestProduct(token) {
    console.log('\n--- Creating Test Product ---');
    
    try {
        // First, let's get categories to use a real category ID
        let categoryId = '507f1f77bcf86cd799439011'; // Default fallback
        
        try {
            const categoriesResponse = await axios.get(`${BASE_URL}/categories`);
            if (categoriesResponse.data.data && categoriesResponse.data.data.length > 0) {
                categoryId = categoriesResponse.data.data[0]._id;
                console.log('✓ Using existing category:', categoryId);
            }
        } catch (catError) {
            console.log('⚠ Using fallback category ID');
        }

        const productData = {
            name: `Test Product ${Date.now()}`,
            description: 'A test product for image API testing',
            price: 99.99,
            sku: `TEST-${Date.now()}`,
            category: categoryId,
            quantity: 10
        };

        const response = await axios.post(`${BASE_URL}/products`, productData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Test product created:', response.data.data._id);
        return response.data.data._id;

    } catch (error) {
        console.log('✗ Failed to create test product:', error.response?.data?.message || error.message);
        return null;
    }
}

// Create a simple test image file
function createSimpleTestImage(filename = 'test.jpg') {
    const imagePath = path.join(__dirname, filename);
    
    // Create a minimal valid JPEG file
    const jpegData = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
        0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
        0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
        0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
        0x00, 0x8A, 0x28, 0xFF, 0xD9
    ]);
    
    fs.writeFileSync(imagePath, jpegData);
    return imagePath;
}

// Test image upload
async function testImageUpload(token, productId) {
    console.log('\n--- Testing Image Upload ---');
    
    try {
        const imagePath = createSimpleTestImage('upload-test.jpg');
        const formData = new FormData();
        formData.append('images', fs.createReadStream(imagePath));

        const response = await axios.post(
            `${BASE_URL}/products/${productId}/images`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...formData.getHeaders()
                }
            }
        );

        console.log('✓ Image upload successful');
        console.log('  Response status:', response.status);
        console.log('  Images count:', response.data.data.images.length);
        
        // Cleanup
        fs.unlinkSync(imagePath);
        return response.data.data.images;

    } catch (error) {
        console.log('✗ Image upload failed:', error.response?.data?.message || error.message);
        console.log('  Status:', error.response?.status);
        return null;
    }
}

// Test image metadata update
async function testImageMetadataUpdate(token, productId, images) {
    console.log('\n--- Testing Image Metadata Update ---');
    
    if (!images || images.length === 0) {
        console.log('⚠ No images to update');
        return true;
    }

    try {
        const updateData = {
            images: [{
                imageId: images[0]._id,
                alt: 'Updated test image',
                order: 0,
                isMain: true
            }]
        };

        const response = await axios.put(
            `${BASE_URL}/products/${productId}/images`,
            updateData,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        console.log('✓ Image metadata update successful');
        console.log('  Response status:', response.status);
        return true;

    } catch (error) {
        console.log('✗ Image metadata update failed:', error.response?.data?.message || error.message);
        console.log('  Status:', error.response?.status);
        return false;
    }
}

// Test image deletion
async function testImageDeletion(token, productId, images) {
    console.log('\n--- Testing Image Deletion ---');
    
    if (!images || images.length === 0) {
        console.log('⚠ No images to delete');
        return true;
    }

    try {
        const deleteData = {
            imageIds: [images[0]._id]
        };

        const response = await axios.delete(
            `${BASE_URL}/products/${productId}/images`,
            {
                headers: { Authorization: `Bearer ${token}` },
                data: deleteData
            }
        );

        console.log('✓ Image deletion successful');
        console.log('  Response status:', response.status);
        console.log('  Remaining images:', response.data.data.images.length);
        return true;

    } catch (error) {
        console.log('✗ Image deletion failed:', error.response?.data?.message || error.message);
        console.log('  Status:', error.response?.status);
        return false;
    }
}

// Main test function
async function runSimpleTest() {
    console.log('🚀 Starting Simple Image API Test\n');

    // Check server health
    const serverRunning = await checkServerHealth();
    if (!serverRunning) {
        console.log('❌ Server is not running. Please start the server first.');
        return;
    }

    // Test auth flow
    const token = await testAuthFlow();
    if (!token) {
        console.log('❌ Authentication failed. Cannot proceed with image tests.');
        return;
    }

    // Create test product
    const productId = await createTestProduct(token);
    if (!productId) {
        console.log('❌ Failed to create test product. Cannot proceed with image tests.');
        return;
    }

    // Test image operations
    let testsPassed = 0;
    let testsTotal = 0;

    // Test 1: Upload image
    testsTotal++;
    const images = await testImageUpload(token, productId);
    if (images) testsPassed++;

    // Test 2: Update metadata
    testsTotal++;
    const updateResult = await testImageMetadataUpdate(token, productId, images);
    if (updateResult) testsPassed++;

    // Test 3: Delete image
    testsTotal++;
    const deleteResult = await testImageDeletion(token, productId, images);
    if (deleteResult) testsPassed++;

    // Cleanup - delete test product
    try {
        await axios.delete(`${BASE_URL}/products/${productId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('\n✓ Test product cleaned up');
    } catch (error) {
        console.log('\n⚠ Failed to cleanup test product');
    }

    console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);
    
    if (testsPassed === testsTotal) {
        console.log('🎉 All image API tests passed successfully!');
    } else {
        console.log('⚠ Some tests failed. Please check the implementation.');
    }
}

// Run the test
runSimpleTest().catch(console.error);
