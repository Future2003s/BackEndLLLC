const fs = require("fs");
const path = require("path");

// Files to fix
const files = [
    "src/controllers/inventoryController.ts",
    "src/controllers/importExportController.ts",
    "src/controllers/notificationController.ts"
];

// Fix ApiResponse calls - complete fix
function fixApiResponseComplete(content) {
    // Fix res.status(200).json(new ApiResponse(true, {data}, "message"))
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\(true, \{([^}]+)\}, "([^"]+)"\)\)/g,
        'res.status($1).json(new ApiResponse(true, "$3", {$2}))'
    );

    // Fix error responses with null
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\(true, null, "([^"]+)"\)\)/g,
        'res.status($1).json(new ApiResponse(false, "$2"))'
    );

    // Fix error responses with data
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\(true, ([^,]+), "([^"]+)"\)\)/g,
        'res.status($1).json(new ApiResponse(true, "$3", $2))'
    );

    return content;
}

// Fix each file
files.forEach((file) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`Fixing ${file}...`);
        let content = fs.readFileSync(filePath, "utf8");
        content = fixApiResponseComplete(content);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed ${file}`);
    } else {
        console.log(`❌ File not found: ${file}`);
    }
});

console.log("✅ All files fixed!");
