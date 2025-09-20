const fs = require("fs");
const path = require("path");

// Files to fix
const files = [
    "src/controllers/inventoryController.ts",
    "src/controllers/importExportController.ts",
    "src/controllers/notificationController.ts"
];

// Fix ApiResponse calls
function fixApiResponse(content) {
    // Fix res.status(200).json(new ApiResponse(200, data, message))
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\((\d+), ([^,]+), "([^"]+)"\)\)/g,
        'res.status($1).json(new ApiResponse(true, "$4", $3))'
    );

    // Fix res.status(201).json(new ApiResponse(201, data, message))
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\((\d+), ([^,]+), "([^"]+)"\)\)/g,
        'res.status($1).json(new ApiResponse(true, "$4", $3))'
    );

    // Fix res.status(400).json(new ApiResponse(400, null, message))
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\((\d+), null, "([^"]+)"\)\)/g,
        'res.status($1).json(new ApiResponse(false, "$3"))'
    );

    // Fix res.status(404).json(new ApiResponse(404, null, message))
    content = content.replace(
        /res\.status\((\d+)\)\.json\(new ApiResponse\((\d+), null, "([^"]+)"\)\)/g,
        'res.status($1).json(new ApiResponse(false, "$3"))'
    );

    return content;
}

// Fix each file
files.forEach((file) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`Fixing ${file}...`);
        let content = fs.readFileSync(filePath, "utf8");
        content = fixApiResponse(content);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed ${file}`);
    } else {
        console.log(`❌ File not found: ${file}`);
    }
});

console.log("✅ All files fixed!");
