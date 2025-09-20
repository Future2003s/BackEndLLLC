const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ShopDev');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'seller', 'customer'], default: 'customer' },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  addresses: [{
    type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
  }],
  preferences: {
    language: { type: String, default: 'vi' },
    currency: { type: String, default: 'VND' },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    }
  }
}, { timestamps: true });

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  isActive: { type: Boolean, default: true },
  image: { type: String },
  order: { type: Number, default: 0 }
}, { timestamps: true });

// Brand Schema
const brandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  logo: { type: String },
  website: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  sku: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 0 },
  maxStock: { type: Number },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  images: [{
    url: { type: String, required: true },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  weight: { type: Number }, // in grams
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number }
  },
  attributes: { type: mongoose.Schema.Types.Mixed },
  // Honey-specific attributes
  honeyType: { 
    type: String, 
    enum: ['acacia', 'wildflower', 'manuka', 'clover', 'eucalyptus', 'lavender'],
    default: 'wildflower'
  },
  purity: { type: Number, min: 0, max: 100, default: 85 }, // Percentage
  harvestDate: { type: Date },
  expiryDate: { type: Date }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Brand = mongoose.model('Brand', brandSchema);
const Product = mongoose.model('Product', productSchema);

// Create honey categories
const createHoneyCategories = async () => {
  const categories = [
    {
      name: 'Mật ong nguyên chất',
      slug: 'mat-ong-nguyen-chat',
      description: 'Mật ong nguyên chất 100% từ thiên nhiên',
      isActive: true,
      order: 1
    },
    {
      name: 'Mật ong hữu cơ',
      slug: 'mat-ong-huu-co',
      description: 'Mật ong hữu cơ được chứng nhận',
      isActive: true,
      order: 2
    },
    {
      name: 'Mật ong đặc sản',
      slug: 'mat-ong-dac-san',
      description: 'Mật ong đặc sản từ các vùng miền',
      isActive: true,
      order: 3
    },
    {
      name: 'Mật ong nhập khẩu',
      slug: 'mat-ong-nhap-khau',
      description: 'Mật ong nhập khẩu chất lượng cao',
      isActive: true,
      order: 4
    }
  ];

  for (const categoryData of categories) {
    const existingCategory = await Category.findOne({ slug: categoryData.slug });
    if (!existingCategory) {
      await Category.create(categoryData);
      console.log(`✅ Created category: ${categoryData.name}`);
    } else {
      console.log(`⚠️ Category already exists: ${categoryData.name}`);
    }
  }
};

// Create honey brands
const createHoneyBrands = async () => {
  const brands = [
    {
      name: 'HoneyLand',
      slug: 'honeyland',
      description: 'Thương hiệu mật ong hàng đầu Việt Nam',
      logo: 'https://via.placeholder.com/150x150/FFD700/000000?text=HoneyLand',
      website: 'https://honeyland.vn',
      isActive: true
    },
    {
      name: 'Bee Natural',
      slug: 'bee-natural',
      description: 'Mật ong tự nhiên 100% nguyên chất',
      logo: 'https://via.placeholder.com/150x150/8B4513/FFFFFF?text=Bee+Natural',
      website: 'https://beenatural.com',
      isActive: true
    },
    {
      name: 'Golden Harvest',
      slug: 'golden-harvest',
      description: 'Mật ong vàng từ những cánh đồng hoa',
      logo: 'https://via.placeholder.com/150x150/FFA500/000000?text=Golden+Harvest',
      website: 'https://goldenharvest.com',
      isActive: true
    },
    {
      name: 'Pure Honey Co.',
      slug: 'pure-honey-co',
      description: 'Công ty mật ong tinh khiết',
      logo: 'https://via.placeholder.com/150x150/32CD32/FFFFFF?text=Pure+Honey',
      website: 'https://purehoney.co',
      isActive: true
    }
  ];

  for (const brandData of brands) {
    const existingBrand = await Brand.findOne({ slug: brandData.slug });
    if (!existingBrand) {
      await Brand.create(brandData);
      console.log(`✅ Created brand: ${brandData.name}`);
    } else {
      console.log(`⚠️ Brand already exists: ${brandData.name}`);
    }
  }
};

// Create honey products
const createHoneyProducts = async () => {
  const categories = await Category.find({});
  const brands = await Brand.find({});
  
  if (categories.length === 0 || brands.length === 0) {
    console.log('❌ No categories or brands found. Please create them first.');
    return;
  }

  const products = [
    {
      name: 'Mật ong hoa nhãn nguyên chất 500g',
      description: 'Mật ong hoa nhãn nguyên chất 100%, thu hoạch từ vùng Tây Bắc. Vị ngọt thanh, hương thơm đặc trưng của hoa nhãn.',
      price: 150000,
      originalPrice: 180000,
      sku: 'HONEY-NHAN-500G',
      quantity: 50,
      minStock: 10,
      maxStock: 100,
      category: categories[0]._id,
      brand: brands[0]._id,
      honeyType: 'acacia',
      purity: 95,
      weight: 500,
      harvestDate: new Date('2024-03-15'),
      expiryDate: new Date('2026-03-15'),
      images: [
        {
          url: 'https://via.placeholder.com/400x400/FFD700/000000?text=Mật+Ong+Hoa+Nhãn',
          alt: 'Mật ong hoa nhãn 500g',
          isPrimary: true,
          order: 1
        }
      ],
      tags: ['mật ong', 'hoa nhãn', 'nguyên chất', 'tự nhiên'],
      isActive: true,
      isFeatured: true
    },
    {
      name: 'Mật ong hoa rừng hữu cơ 1kg',
      description: 'Mật ong hoa rừng hữu cơ được chứng nhận, thu hoạch từ rừng nguyên sinh. Vị đậm đà, giàu dinh dưỡng.',
      price: 280000,
      originalPrice: 320000,
      sku: 'HONEY-RUNG-1KG',
      quantity: 30,
      minStock: 8,
      maxStock: 80,
      category: categories[1]._id,
      brand: brands[1]._id,
      honeyType: 'wildflower',
      purity: 98,
      weight: 1000,
      harvestDate: new Date('2024-02-20'),
      expiryDate: new Date('2026-02-20'),
      images: [
        {
          url: 'https://via.placeholder.com/400x400/8B4513/FFFFFF?text=Mật+Ong+Hoa+Rừng',
          alt: 'Mật ong hoa rừng 1kg',
          isPrimary: true,
          order: 1
        }
      ],
      tags: ['mật ong', 'hoa rừng', 'hữu cơ', 'chứng nhận'],
      isActive: true,
      isFeatured: true
    },
    {
      name: 'Mật ong Manuka MGO 100+ 250g',
      description: 'Mật ong Manuka nhập khẩu từ New Zealand, chỉ số MGO 100+. Có tác dụng kháng khuẩn cao, tốt cho sức khỏe.',
      price: 450000,
      originalPrice: 500000,
      sku: 'HONEY-MANUKA-250G',
      quantity: 20,
      minStock: 5,
      maxStock: 50,
      category: categories[3]._id,
      brand: brands[2]._id,
      honeyType: 'manuka',
      purity: 100,
      weight: 250,
      harvestDate: new Date('2024-01-10'),
      expiryDate: new Date('2027-01-10'),
      images: [
        {
          url: 'https://via.placeholder.com/400x400/800080/FFFFFF?text=Mật+Ong+Manuka',
          alt: 'Mật ong Manuka 250g',
          isPrimary: true,
          order: 1
        }
      ],
      tags: ['mật ong', 'manuka', 'nhập khẩu', 'MGO 100+', 'kháng khuẩn'],
      isActive: true,
      isFeatured: true
    },
    {
      name: 'Mật ong hoa cỏ ba lá 750g',
      description: 'Mật ong hoa cỏ ba lá có vị ngọt dịu, màu vàng nhạt. Thích hợp cho trẻ em và người cao tuổi.',
      price: 200000,
      sku: 'HONEY-COBA-LA-750G',
      quantity: 40,
      minStock: 12,
      maxStock: 60,
      category: categories[0]._id,
      brand: brands[3]._id,
      honeyType: 'clover',
      purity: 90,
      weight: 750,
      harvestDate: new Date('2024-04-01'),
      expiryDate: new Date('2026-04-01'),
      images: [
        {
          url: 'https://via.placeholder.com/400x400/32CD32/FFFFFF?text=Mật+Ong+Cỏ+Ba+Lá',
          alt: 'Mật ong hoa cỏ ba lá 750g',
          isPrimary: true,
          order: 1
        }
      ],
      tags: ['mật ong', 'hoa cỏ ba lá', 'ngọt dịu', 'trẻ em'],
      isActive: true,
      isFeatured: false
    },
    {
      name: 'Mật ong hoa bạch đàn 350g',
      description: 'Mật ong hoa bạch đàn có hương thơm đặc trưng, vị ngọt thanh. Tốt cho hệ hô hấp.',
      price: 120000,
      sku: 'HONEY-BACH-DAN-350G',
      quantity: 0,
      minStock: 15,
      maxStock: 40,
      category: categories[0]._id,
      brand: brands[0]._id,
      honeyType: 'eucalyptus',
      purity: 88,
      weight: 350,
      harvestDate: new Date('2024-03-01'),
      expiryDate: new Date('2026-03-01'),
      images: [
        {
          url: 'https://via.placeholder.com/400x400/4169E1/FFFFFF?text=Mật+Ong+Bạch+Đàn',
          alt: 'Mật ong hoa bạch đàn 350g',
          isPrimary: true,
          order: 1
        }
      ],
      tags: ['mật ong', 'hoa bạch đàn', 'hô hấp', 'hương thơm'],
      isActive: true,
      isFeatured: false
    },
    {
      name: 'Mật ong hoa oải hương 200g',
      description: 'Mật ong hoa oải hương có hương thơm dịu nhẹ, giúp thư giãn tinh thần. Thích hợp dùng trước khi ngủ.',
      price: 180000,
      sku: 'HONEY-OAI-HUONG-200G',
      quantity: 25,
      minStock: 8,
      maxStock: 30,
      category: categories[2]._id,
      brand: brands[1]._id,
      honeyType: 'lavender',
      purity: 92,
      weight: 200,
      harvestDate: new Date('2024-05-15'),
      expiryDate: new Date('2026-05-15'),
      images: [
        {
          url: 'https://via.placeholder.com/400x400/DA70D6/FFFFFF?text=Mật+Ong+Oải+Hương',
          alt: 'Mật ong hoa oải hương 200g',
          isPrimary: true,
          order: 1
        }
      ],
      tags: ['mật ong', 'hoa oải hương', 'thư giãn', 'ngủ ngon'],
      isActive: true,
      isFeatured: false
    }
  ];

  for (const productData of products) {
    const existingProduct = await Product.findOne({ sku: productData.sku });
    if (!existingProduct) {
      await Product.create(productData);
      console.log(`✅ Created product: ${productData.name}`);
    } else {
      console.log(`⚠️ Product already exists: ${productData.name}`);
    }
  }
};

// Create admin user
const createAdminUser = async () => {
  const existingAdmin = await User.findOne({ email: 'admin@honey.com' });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await User.create({
      firstName: 'Admin',
      lastName: 'Honey',
      email: 'admin@honey.com',
      password: hashedPassword,
      phone: '0123456789',
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    });
    console.log('✅ Created admin user: admin@honey.com / admin123');
  } else {
    console.log('⚠️ Admin user already exists');
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    console.log('🍯 Creating honey management data...\n');
    
    await createAdminUser();
    console.log('');
    
    await createHoneyCategories();
    console.log('');
    
    await createHoneyBrands();
    console.log('');
    
    await createHoneyProducts();
    console.log('');
    
    console.log('✅ Honey data creation completed!');
    console.log('\n📋 Summary:');
    console.log('- Admin user: admin@honey.com / admin123');
    console.log('- 4 honey categories created');
    console.log('- 4 honey brands created');
    console.log('- 6 honey products created');
    
  } catch (error) {
    console.error('❌ Error creating honey data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

main();
