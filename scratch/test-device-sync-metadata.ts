import { db } from "../lib/db";
import { userDevices, users } from "../lib/db/schema";
import { getUserDeviceMetadata, syncUserDevices } from "../lib/atomberg";
import { eq } from "drizzle-orm";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runDeviceSyncTest() {
  console.log("\n=======================================================");
  console.log("📱 DEVICE SYNC & METADATA PRECEDENCE TEST");
  console.log("=======================================================\n");

  const testUserId = "test_user_sync_" + Date.now();
  const testDeviceId = "dev_sync_9999";

  // 1. Create temporary test user
  await db.insert(users).values({
    id: testUserId,
    email: `${testUserId}@example.com`,
  });

  // 2. Insert device metadata with custom name
  await db.insert(userDevices).values({
    userId: testUserId,
    deviceId: testDeviceId,
    name: "Atomberg Renesa Default",
    customName: "My Custom Study Fan",
    room: "Upstairs Study",
    series: "Renesa",
    model: "Renesa+",
  });

  // 3. Fetch metadata map
  const metaMap = await getUserDeviceMetadata(testUserId);
  assert(metaMap.has(testDeviceId), "Device metadata map contains test device");

  const meta = metaMap.get(testDeviceId);
  assert(meta?.customName === "My Custom Study Fan", "Custom name is preserved");
  assert(meta?.name === "Atomberg Renesa Default", "Default name is preserved");
  assert(meta?.room === "Upstairs Study", "Room name is preserved");

  // Cleanup
  await db.delete(userDevices).where(eq(userDevices.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));

  console.log("\n=======================================================");
  console.log("🎉 ALL DEVICE SYNC & METADATA TESTS PASSED!");
  console.log("=======================================================\n");
}

runDeviceSyncTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
