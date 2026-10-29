import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFiles(dir, matchExt = ".js") {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "node_modules" || file === ".git" || file === "models_legacy") continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, matchExt));
    } else if (file.endsWith(matchExt)) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log("=== SCANNING BACKEND FILES FOR MONGOOSE / MONGODB ===");
const backendFiles = getFiles(__dirname, ".js");
const mongooseMatches = [];

for (const file of backendFiles) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (
      line.includes("mongoose") ||
      line.includes("ObjectId") ||
      line.includes("mongoUri") ||
      line.includes("mongodb")
    ) {
      // ignore comment-only lines if desirable, but let's record everything
      mongooseMatches.push({
        file: path.relative(__dirname, file),
        line: idx + 1,
        text: line.trim(),
      });
    }
  });
}

console.log(`Found ${mongooseMatches.length} references:`);
mongooseMatches.forEach((m) => {
  console.log(`[${m.file}:${m.line}] ${m.text}`);
});

console.log("\n=== INSPECTING CONTROLLERS PRISMA ADOPTION ===");
const controllerFiles = getFiles(path.join(__dirname, "controllers"), ".js");
console.log(`Total controllers found: ${controllerFiles.length}`);

const controllersWithoutPrisma = [];
for (const file of controllerFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes("prisma")) {
    controllersWithoutPrisma.push(path.basename(file));
  }
}

if (controllersWithoutPrisma.length > 0) {
  console.log(`⚠️ Controllers not directly referencing prisma (${controllersWithoutPrisma.length}):`);
  console.log(controllersWithoutPrisma.join(", "));
} else {
  console.log("✅ All controllers reference prisma directly.");
}

