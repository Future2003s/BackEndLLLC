const fs = require("fs");
const path = require("path");

// Files to fix
const files = [
    "src/controllers/inventoryController.ts",
    "src/controllers/importExportController.ts",
    "src/controllers/notificationController.ts"
];

// Fix all remaining ApiResponse calls
function fixAllErrors(content) {
    // Fix remaining ApiResponse calls with status codes
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\((\d+),/g,
        "res.status($1).json(new ApiResponse(true,"
    );

    // Fix error responses
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\(false, "([^"]+)", null\)\)/g,
        'res.status($1).json(new ApiResponse(false, "$2"))'
    );

    // Fix error responses with data
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\(false, "([^"]+)", ([^)]+)\)\)/g,
        'res.status($1).json(new ApiResponse(false, "$2", $3))'
    );

    return content;
}

// Fix each file
files.forEach((file) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`Fixing ${file}...`);
        let content = fs.readFileSync(filePath, "utf8");
        content = fixAllErrors(content);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed ${file}`);
    } else {
        console.log(`❌ File not found: ${file}`);
    }
});

console.log("✅ All files fixed!");
