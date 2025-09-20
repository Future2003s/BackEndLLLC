const fs = require("fs");
const path = require("path");

console.log("🍯 Testing Honey Management Structure...\n");

// Check if required files exist
const requiredFiles = [
    "src/controllers/productController.ts",
    "src/controllers/categoryController.ts",
    "src/controllers/brandController.ts",
    "src/routes/products.ts",
    "src/routes/categories.ts",
    "src/routes/brands.ts",
    "src/models/Product.ts",
    "src/models/Category.ts",
    "src/models/Brand.ts"
];

console.log("📁 Checking required files...");
let allFilesExist = true;

requiredFiles.forEach((file) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - Missing`);
        allFilesExist = false;
    }
});

// Check Product model for honey-specific fields
console.log("\n🔍 Checking Product model for honey fields...");
try {
    const productModelPath = path.join(__dirname, "src/models/Product.ts");
    if (fs.existsSync(productModelPath)) {
        const productModelContent = fs.readFileSync(productModelPath, "utf8");

        const honeyFields = ["honeyType", "purity", "harvestDate", "expiryDate"];

        honeyFields.forEach((field) => {
            if (productModelContent.includes(field)) {
                console.log(`✅ honeyType field found`);
            } else {
                console.log(`❌ ${field} field missing`);
            }
        });
    } else {
        console.log("❌ Product model not found");
    }
} catch (error) {
    console.log("❌ Error reading Product model:", error.message);
}

// Check if honey data creation script exists
console.log("\n📝 Checking honey data creation script...");
const honeyDataScript = path.join(__dirname, "create-honey-data.js");
if (fs.existsSync(honeyDataScript)) {
    console.log("✅ create-honey-data.js exists");

    // Check if script has honey-specific content
    const scriptContent = fs.readFileSync(honeyDataScript, "utf8");
    if (scriptContent.includes("honeyType") && scriptContent.includes("purity")) {
        console.log("✅ Script contains honey-specific fields");
    } else {
        console.log("❌ Script missing honey-specific fields");
    }
} else {
    console.log("❌ create-honey-data.js not found");
}

// Check frontend honey components
console.log("\n🎨 Checking frontend honey components...");
const frontendPath = path.join(__dirname, "../QuanLyHangTon/managerment");
const frontendFiles = [
    "app/components/products/HoneyProductManagement.tsx",
    "app/components/dashboard/HoneyDashboard.tsx",
    "app/products/honey/page.tsx",
    "app/dashboard/honey/page.tsx"
];

frontendFiles.forEach((file) => {
    const filePath = path.join(frontendPath, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - Missing`);
    }
});

// Check package.json for required dependencies
console.log("\n📦 Checking dependencies...");
try {
    const packageJsonPath = path.join(__dirname, "package.json");
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        const requiredDeps = ["mongoose", "bcryptjs", "express", "cors"];

        requiredDeps.forEach((dep) => {
            if (packageJson.dependencies && packageJson.dependencies[dep]) {
                console.log(`✅ ${dep} - ${packageJson.dependencies[dep]}`);
            } else {
                console.log(`❌ ${dep} - Missing`);
            }
        });
    }
} catch (error) {
    console.log("❌ Error reading package.json:", error.message);
}

// Check frontend package.json
console.log("\n🎨 Checking frontend dependencies...");
try {
    const frontendPackageJsonPath = path.join(frontendPath, "package.json");
    if (fs.existsSync(frontendPackageJsonPath)) {
        const frontendPackageJson = JSON.parse(fs.readFileSync(frontendPackageJsonPath, "utf8"));
        const requiredFrontendDeps = ["@tanstack/react-query", "zustand", "next"];

        requiredFrontendDeps.forEach((dep) => {
            if (frontendPackageJson.dependencies && frontendPackageJson.dependencies[dep]) {
                console.log(`✅ ${dep} - ${frontendPackageJson.dependencies[dep]}`);
            } else {
                console.log(`❌ ${dep} - Missing`);
            }
        });
    }
} catch (error) {
    console.log("❌ Error reading frontend package.json:", error.message);
}

console.log("\n📋 Summary:");
console.log("- Backend structure: " + (allFilesExist ? "✅ Complete" : "❌ Incomplete"));
console.log(
    "- Frontend components: " +
        (frontendFiles.every((f) => fs.existsSync(path.join(frontendPath, f))) ? "✅ Complete" : "❌ Incomplete")
);
console.log("- Honey data script: " + (fs.existsSync(honeyDataScript) ? "✅ Available" : "❌ Missing"));

console.log("\n🚀 Next steps:");
console.log("1. Install and start MongoDB");
console.log("2. Run: node create-honey-data.js");
console.log("3. Start backend: npm run dev");
console.log("4. Start frontend: cd ../QuanLyHangTon/managerment && npm run dev");
console.log("5. Visit: http://localhost:3000/products/honey");
