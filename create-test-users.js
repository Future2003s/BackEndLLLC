const axios = require('axios');

const BASE_URL = 'http://localhost:8081/api/v1';

async function createTestUsers() {
    console.log('Creating test users...\n');

    // Admin user
    const adminUser = {
        name: 'Admin User',
        email: 'admin@shopdev.com',
        password: 'Admin123!',
        phone: '+84901234567',
        role: 'admin'
    };

    // Seller user  
    const sellerUser = {
        name: 'Seller User',
        email: 'seller@shopdev.com',
        password: 'Seller123!',
        phone: '+84901234568',
        role: 'seller'
    };

    try {
        // Create admin
        console.log('Creating admin user...');
        const adminResponse = await axios.post(`${BASE_URL}/auth/register`, adminUser);
        console.log('✓ Admin user created successfully');
        
        // Create seller
        console.log('Creating seller user...');
        const sellerResponse = await axios.post(`${BASE_URL}/auth/register`, sellerUser);
        console.log('✓ Seller user created successfully');

        console.log('\nTest users created successfully!');
        console.log('Admin: admin@shopdev.com / Admin123!');
        console.log('Seller: seller@shopdev.com / Seller123!');

    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
            console.log('✓ Test users already exist');
        } else {
            console.error('Error creating users:', error.response?.data?.message || error.message);
        }
    }
}

createTestUsers();
