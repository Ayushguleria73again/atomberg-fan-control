import { db } from "../lib/db";
import { atombergConnections } from "../lib/db/schema";
import { encryptCredentials } from "../lib/crypto/encryption";

const BASE_URL = "http://localhost:3000";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ HTTP ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runHttpIsolationSuite() {
  console.log("\n=======================================================");
  console.log("🌐 PHASE C HTTP API END-TO-END ISOLATION TEST SUITE");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const userAEmail = `tenant_a_${timestamp}@fancontrol.test`;
  const userBEmail = `tenant_b_${timestamp}@fancontrol.test`;
  const password = "TestPassword123!";

  // 1. Register User A
  const resRegA = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Tenant A", email: userAEmail, password }),
  });
  const cookieA = resRegA.headers.get("set-cookie") || "";
  const dataA = await resRegA.json();
  assert(resRegA.ok && dataA.ok, `User A registered successfully (${dataA.user.id})`);
  const userAId = dataA.user.id;

  // 2. Register User B
  const resRegB = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Tenant B", email: userBEmail, password }),
  });
  const cookieB = resRegB.headers.get("set-cookie") || "";
  const dataB = await resRegB.json();
  assert(resRegB.ok && dataB.ok, `User B registered successfully (${dataB.user.id})`);
  const userBId = dataB.user.id;

  // 3. Insert encrypted connections for User A and User B
  const encA = encryptCredentials("api_key_tenant_alpha", "refresh_tenant_alpha");
  const encB = encryptCredentials("api_key_tenant_beta", "refresh_tenant_beta");

  await db.insert(atombergConnections).values({
    userId: userAId,
    encCredentials: encA.encCredentials,
    iv: encA.iv,
    authTag: encA.authTag,
    keyVersion: encA.keyVersion,
  });

  await db.insert(atombergConnections).values({
    userId: userBId,
    encCredentials: encB.encCredentials,
    iv: encB.iv,
    authTag: encB.authTag,
    keyVersion: encB.keyVersion,
  });

  console.log("✅ Encrypted connection rows inserted in database for both tenants.");

  // 4. Verify GET /api/connect returns connected: true for each respective tenant
  const resConnA = await fetch(`${BASE_URL}/api/connect`, {
    headers: { Cookie: cookieA },
  });
  const jsonConnA = await resConnA.json();
  assert(resConnA.ok && jsonConnA.connected === true, "User A GET /api/connect recognizes connection");

  const resConnB = await fetch(`${BASE_URL}/api/connect`, {
    headers: { Cookie: cookieB },
  });
  const jsonConnB = await resConnB.json();
  assert(resConnB.ok && jsonConnB.connected === true, "User B GET /api/connect recognizes connection");

  // 5. Test Rate Limiting on Command endpoint over HTTP
  console.log("\n--- Testing HTTP Rate Limiting on POST /api/fans/:id/cmd ---");
  let rateLimited = false;
  let retryAfterHeader = "";
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${BASE_URL}/api/fans/device_alpha_1/cmd`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ action: "power", value: true }),
    });
    if (res.status === 429) {
      rateLimited = true;
      retryAfterHeader = res.headers.get("retry-after") || "";
      break;
    }
  }
  assert(
    rateLimited,
    `User A command endpoint returned HTTP 429 Too Many Requests (Retry-After: ${retryAfterHeader || "N/A"})`
  );

  // 6. Verify User B is NOT throttled when User A is rate limited
  const resUserBUnthrottled = await fetch(`${BASE_URL}/api/connect`, {
    headers: { Cookie: cookieB },
  });
  assert(
    resUserBUnthrottled.status === 200,
    "User B remains unthrottled and can access API while User A is rate limited"
  );

  // 7. Test Connect Rate Limiting (5 per minute)
  console.log("\n--- Testing HTTP Rate Limiting on POST /api/connect ---");
  let connectRateLimited = false;
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${BASE_URL}/api/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ apiKey: "test", refreshToken: "test" }),
    });
    if (res.status === 429) {
      connectRateLimited = true;
      break;
    }
  }
  assert(
    connectRateLimited,
    "POST /api/connect throttled with HTTP 429 Too Many Requests after 5 attempts"
  );

  // 8. Test Unauthenticated Access Gate
  const unauthRes = await fetch(`${BASE_URL}/api/fans`);
  assert(unauthRes.status === 401, "Unauthenticated request to /api/fans is blocked with HTTP 401");

  console.log("\n=======================================================");
  console.log("🎉 ALL HTTP API MULTI-TENANT ISOLATION TESTS PASSED!");
  console.log("=======================================================\n");
  process.exit(0);
}

runHttpIsolationSuite().catch((err) => {
  console.error("HTTP Isolation test suite failed:", err);
  process.exit(1);
});
