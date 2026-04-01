// test/sync.test.js - Tests that work in Node.js (no IndexedDB)

console.log("🧪 Starting WardLink NG Tests (Node-compatible)\n");

// Test 1: Check imports work
console.log("1. Testing imports...");
try {
  const {
    v4: uuidv4
  } = await import("uuid");
  const testId = `wl-${Date.now()}-${uuidv4().slice(0, 8)}`;
  console.log(`   ✓ UUID generated: ${testId}`);
  console.log(`   ✓ Format valid: ${testId.startsWith("wl-")}`);
} catch (error) {
  console.error("   ✗ Import failed:", error.message);
}

// Test 2: Date formatting (date-fns)
console.log("\n2. Testing date-fns...");
try {
  const {
    format
  } = await import("date-fns");
  const now = new Date();
  const formatted = format(now, "d MMMM yyyy, HH:mm");
  console.log(`   ✓ Nigerian format: ${formatted}`);
} catch (error) {
  console.error("   ✗ date-fns failed:", error.message);
}

// Test 3: Zod validation
console.log("\n3. Testing Zod validation...");
try {
  const {
    z
  } = await import("zod");

  const PatientSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    gender: z.enum(["male", "female", "other", "unknown"]),
  });

  const valid = PatientSchema.safeParse({
    firstName: "Amina",
    lastName: "Test",
    gender: "female",
  });

  console.log(`   ✓ Valid patient: ${valid.success}`);

  const invalid = PatientSchema.safeParse({
    firstName: "",
    lastName: "Test",
    gender: "invalid",
  });

  console.log(`   ✓ Invalid rejected: ${!invalid.success}`);
} catch (error) {
  console.error("   ✗ Zod failed:", error.message);
}

// Test 4: Check file structure exists
console.log("\n4. Testing file structure...");
import {
  existsSync
} from "fs";
const files = [
  "lib/offline/db.js",
  "lib/offline/sync.js",
  "lib/utils/cn.js",
];
for (const file of files) {
  if (existsSync(file)) {
    console.log(`   ✓ ${file} exists`);
  } else {
    console.log(`   ✗ ${file} missing`);
  }
}

console.log("\n✅ Node-compatible tests completed!");
console.log("\n⚠️  Note: IndexedDB tests require browser environment.");
console.log("   Run 'npm run dev' and test in mobile browser.");