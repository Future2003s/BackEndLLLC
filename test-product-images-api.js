const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8081/api/v1';

// Test configuration
const testConfig = {
    adminCredentials: {
        email: 'admin@shopdev.com',
        password: 'Admin123!'
    },
    sellerCredentials: {
        email: 'seller@shopdev.com', 
        password: 'Seller123!'
    }
};

let adminToken = '';
let sellerToken = '';
let testProductId = '';

// Helper function to create test image file
function createTestImageFile(filename = 'test-image.jpg') {
    const testImagePath = path.join(__dirname, filename);
    
    // Create a simple test image buffer (1x1 pixel JPEG)
    const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
        0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
        0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x28,
        0xFF, 0xD9
    ]);
    
    fs.writeFileSync(testImagePath, jpegHeader);
    return testImagePath;
}

// Authentication functions
async function loginAdmin() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, testConfig.adminCredentials);
        adminToken = response.data.token;
        console.log('✓ Admin login successful');
        return true;
    } catch (error) {
        console.error('✗ Admin login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function loginSeller() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, testConfig.sellerCredentials);
        sellerToken = response.data.token;
        console.log('✓ Seller login successful');
        return true;
    } catch (error) {
        console.error('✗ Seller login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

// Create test product
async function createTestProduct() {
    try {
        const productData = {
            name: 'Test Product for Images',
            description: 'A test product for image management API testing',
            price: 99.99,
            sku: `TEST-IMG-${Date.now()}`,
            category: '507f1f77bcf86cd799439011', // Replace with actual category ID
            quantity: 10
        };

        const response = await axios.post(`${BASE_URL}/products`, productData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        testProductId = response.data.data._id;
        console.log('✓ Test product created:', testProductId);
        return true;
    } catch (error) {
        console.error('✗ Failed to create test product:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test 1: Upload single image
async function testUploadSingleImage() {
    console.log('\n--- Test 1: Upload Single Image ---');
    
    try {
        const imagePath = createTestImageFile('single-test.jpg');
        const formData = new FormData();
        formData.append('images', fs.createReadStream(imagePath));

        const response = await axios.post(
            `${BASE_URL}/products/${testProductId}/images`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    ...formData.getHeaders()
                }
            }
        );

        console.log('✓ Single image upload successful');
        console.log('  Images count:', response.data.data.images.length);
        console.log('  Main image set:', response.data.data.images.some(img => img.isMain));
        
        // Cleanup
        fs.unlinkSync(imagePath);
        return true;
    } catch (error) {
        console.error('✗ Single image upload failed:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test 2: Upload multiple images
async function testUploadMultipleImages() {
    console.log('\n--- Test 2: Upload Multiple Images ---');
    
    try {
        const imagePaths = [
            createTestImageFile('multi-test-1.jpg'),
            createTestImageFile('multi-test-2.jpg'),
            createTestImageFile('multi-test-3.jpg')
        ];

        const formData = new FormData();
        imagePaths.forEach(imagePath => {
            formData.append('images', fs.createReadStream(imagePath));
        });

        const response = await axios.post(
            `${BASE_URL}/products/${testProductId}/images`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    ...formData.getHeaders()
                }
            }
        );

        console.log('✓ Multiple images upload successful');
        console.log('  Total images count:', response.data.data.images.length);
        
        // Cleanup
        imagePaths.forEach(imagePath => fs.unlinkSync(imagePath));
        return true;
    } catch (error) {
        console.error('✗ Multiple images upload failed:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test 3: Update image metadata
async function testUpdateImageMetadata() {
    console.log('\n--- Test 3: Update Image Metadata ---');
    
    try {
        // First get current product to get image IDs
        const productResponse = await axios.get(`${BASE_URL}/products/${testProductId}`);
        const images = productResponse.data.data.images;
        
        if (images.length === 0) {
            console.log('⚠ No images to update');
            return true;
        }

        const updateData = {
            images: [
                {
                    imageId: images[0]._id,
                    alt: 'Updated alt text for first image',
                    order: 0,
                    isMain: true
                }
            ]
        };

        if (images.length > 1) {
            updateData.images.push({
                imageId: images[1]._id,
                alt: 'Updated alt text for second image',
                order: 1
            });
        }

        const response = await axios.put(
            `${BASE_URL}/products/${testProductId}/images`,
            updateData,
            {
                headers: { Authorization: `Bearer ${adminToken}` }
            }
        );

        console.log('✓ Image metadata update successful');
        console.log('  Updated images count:', updateData.images.length);
        return true;
    } catch (error) {
        console.error('✗ Image metadata update failed:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test 4: Delete images
async function testDeleteImages() {
    console.log('\n--- Test 4: Delete Images ---');
    
    try {
        // Get current product to get image IDs
        const productResponse = await axios.get(`${BASE_URL}/products/${testProductId}`);
        const images = productResponse.data.data.images;
        
        if (images.length === 0) {
            console.log('⚠ No images to delete');
            return true;
        }

        // Delete the last image
        const imageToDelete = images[images.length - 1];
        const deleteData = {
            imageIds: [imageToDelete._id]
        };

        const response = await axios.delete(
            `${BASE_URL}/products/${testProductId}/images`,
            {
                headers: { Authorization: `Bearer ${adminToken}` },
                data: deleteData
            }
        );

        console.log('✓ Image deletion successful');
        console.log('  Remaining images:', response.data.data.images.length);
        return true;
    } catch (error) {
        console.error('✗ Image deletion failed:', error.response?.data?.message || error.message);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Product Images API Tests\n');

    // Authentication
    const adminAuth = await loginAdmin();
    const sellerAuth = await loginSeller();
    
    if (!adminAuth) {
        console.log('❌ Cannot proceed without admin authentication');
        return;
    }

    // Create test product
    const productCreated = await createTestProduct();
    if (!productCreated) {
        console.log('❌ Cannot proceed without test product');
        return;
    }

    // Run tests
    const tests = [
        testUploadSingleImage,
        testUploadMultipleImages,
        testUpdateImageMetadata,
        testDeleteImages
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const result = await test();
        if (result) {
            passed++;
        } else {
            failed++;
        }
    }

    // Cleanup - delete test product
    try {
        await axios.delete(`${BASE_URL}/products/${testProductId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('\n✓ Test product cleaned up');
    } catch (error) {
        console.log('\n⚠ Failed to cleanup test product');
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
}

// Run tests
runTests().catch(console.error);
