import {
  setCachedFanState,
  getCachedFanState,
  updateCachedFanOptimistic,
  invalidateFanState,
  setCachedAccessToken,
  getCachedAccessToken,
  invalidateAccessToken,
} from "../lib/cache";
import { sendFanCommandForUser } from "../lib/atomberg";
import {
  checkFanCommandRateLimit,
  checkConnectRateLimit,
  checkFansPollRateLimit,
} from "../lib/rate-limit";
import { NormalizedFanState } from "../lib/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runIsolationSuite() {
  console.log("\n=======================================================");
  console.log("🔒 PHASE C MULTI-TENANT ISOLATION & SECURITY TEST SUITE");
  console.log("=======================================================\n");

  const USER_A_ID = "user_tenant_alpha_" + Date.now();
  const USER_B_ID = "user_tenant_beta_" + Date.now();

  const userAFans: NormalizedFanState[] = [
    {
      id: "fan_alpha_101",
      name: "Alpha Master Fan",
      room: "Bedroom",
      model: "Renesa",
      series: "Smart",
      online: true,
      power: false,
      speed: 1,
      led: false,
      sleep: false,
      timerHours: 0,
      hasLed: true,
      hasSleep: true,
      hasTimer: true,
      lastUpdated: Date.now(),
    },
    {
      id: "fan_alpha_102",
      name: "Alpha Living Fan",
      room: "Living Room",
      model: "Studio+",
      series: "Smart",
      online: true,
      power: true,
      speed: 3,
      led: true,
      sleep: false,
      timerHours: 0,
      hasLed: true,
      hasSleep: true,
      hasTimer: true,
      lastUpdated: Date.now(),
    },
  ];

  const userBFans: NormalizedFanState[] = [
    {
      id: "fan_beta_201",
      name: "Beta Study Fan",
      room: "Study",
      model: "Aria",
      series: "Smart",
      online: true,
      power: true,
      speed: 4,
      led: false,
      sleep: true,
      timerHours: 2,
      hasLed: false,
      hasSleep: true,
      hasTimer: true,
      lastUpdated: Date.now(),
    },
  ];

  // -------------------------------------------------------------
  // TEST 1: Cache Partitioning & Quota Isolation
  // -------------------------------------------------------------
  console.log("--- Test 1: Per-User Cache Partitioning ---");

  setCachedFanState(USER_A_ID, userAFans);
  setCachedFanState(USER_B_ID, userBFans);

  const cachedA = getCachedFanState(USER_A_ID);
  const cachedB = getCachedFanState(USER_B_ID);

  assert(
    cachedA !== null && cachedA.fans.length === 2,
    "User A cache contains exactly User A's 2 fans"
  );
  assert(
    cachedA!.fans[0].id === "fan_alpha_101" && cachedA!.fans[1].id === "fan_alpha_102",
    "User A cannot see any of User B's fans in cache"
  );

  assert(
    cachedB !== null && cachedB.fans.length === 1,
    "User B cache contains exactly User B's 1 fan"
  );
  assert(
    cachedB!.fans[0].id === "fan_beta_201",
    "User B cannot see any of User A's fans in cache"
  );

  // Optimistic update on User A must not affect User B
  updateCachedFanOptimistic(USER_A_ID, "fan_alpha_101", { speed: 6, power: true });
  const updatedA = getCachedFanState(USER_A_ID);
  const unaffectedB = getCachedFanState(USER_B_ID);

  assert(
    updatedA?.fans.find((f) => f.id === "fan_alpha_101")?.speed === 6,
    "User A optimistic speed update applied to User A cache"
  );
  assert(
    unaffectedB?.fans[0].speed === 4 && unaffectedB?.fans[0].id === "fan_beta_201",
    "User B cache is completely isolated from User A cache mutations"
  );

  // Invalidate User A cache -> User B cache persists
  invalidateFanState(USER_A_ID);
  assert(getCachedFanState(USER_A_ID) === null, "User A cache invalidated cleanly");
  assert(getCachedFanState(USER_B_ID) !== null, "User B cache unaffected by User A invalidation");

  // Access token per-user cache
  setCachedAccessToken(USER_A_ID, "token_alpha_123");
  setCachedAccessToken(USER_B_ID, "token_beta_456");
  assert(getCachedAccessToken(USER_A_ID) === "token_alpha_123", "User A access token cached separately");
  assert(getCachedAccessToken(USER_B_ID) === "token_beta_456", "User B access token cached separately");
  invalidateAccessToken(USER_A_ID);
  assert(getCachedAccessToken(USER_A_ID) === null, "User A access token removed");
  assert(getCachedAccessToken(USER_B_ID) === "token_beta_456", "User B access token persists");

  // -------------------------------------------------------------
  // TEST 2: Device Ownership Checks (Cross-Tenant 403 Prevention)
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Cross-Tenant Ownership Checks ---");
  // Repopulate caches
  setCachedFanState(USER_A_ID, userAFans);
  setCachedFanState(USER_B_ID, userBFans);

  // User A attempts to control User B's device (fan_beta_201)
  let userABlocked = false;
  try {
    await sendFanCommandForUser(USER_A_ID, "fan_beta_201", { power: false });
  } catch (err: any) {
    if (err.message.includes("Forbidden: Device ID fan_beta_201 does not belong to your account")) {
      userABlocked = true;
    }
  }
  assert(userABlocked, "User A attempting to control User B's fan is REJECTED with 403 Forbidden");

  // User B attempts to control User A's device (fan_alpha_101)
  let userBBlocked = false;
  try {
    await sendFanCommandForUser(USER_B_ID, "fan_alpha_101", { speed: 2 });
  } catch (err: any) {
    if (err.message.includes("Forbidden: Device ID fan_alpha_101 does not belong to your account")) {
      userBBlocked = true;
    }
  }
  assert(userBBlocked, "User B attempting to control User A's fan is REJECTED with 403 Forbidden");

  // User A attempts to control an arbitrary unowned random device ID
  let randomBlocked = false;
  try {
    await sendFanCommandForUser(USER_A_ID, "random_attacker_device_999", { power: true });
  } catch (err: any) {
    if (err.message.includes("Forbidden: Device ID random_attacker_device_999 does not belong to your account")) {
      randomBlocked = true;
    }
  }
  assert(randomBlocked, "Arbitrary unowned device ID is REJECTED with 403 Forbidden");

  // -------------------------------------------------------------
  // TEST 3: Rate Limiting & Abuse Prevention
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Per-User Rate Limiting ---");

  const testUserId = "ratelimit_user_" + Date.now();
  const testUserOther = "ratelimit_other_" + Date.now();

  // Test command rate limit (15 per 10s)
  let commandLimitHit = false;
  for (let i = 0; i < 20; i++) {
    const res = await checkFanCommandRateLimit(testUserId);
    if (!res.success) {
      commandLimitHit = true;
      break;
    }
  }
  assert(commandLimitHit, "Fan command rate limiter successfully throttles rapid requests (>15 in 10s)");

  // Another user's rate limit budget must be untouched
  const otherUserRes = await checkFanCommandRateLimit(testUserOther);
  assert(otherUserRes.success, "Rate limits are isolated per-user: Other user is not throttled");

  // Test connect rate limit (5 per 60s)
  const connectId = "connect_ip_" + Date.now();
  let connectLimitHit = false;
  for (let i = 0; i < 10; i++) {
    const res = await checkConnectRateLimit(connectId);
    if (!res.success) {
      connectLimitHit = true;
      break;
    }
  }
  assert(connectLimitHit, "Connect rate limiter successfully throttles excessive verification calls (>5 in 60s)");

  console.log("\n=======================================================");
  console.log("🎉 ALL PHASE C ISOLATION & SECURITY TESTS PASSED!");
  console.log("=======================================================\n");
}

runIsolationSuite().catch((err) => {
  console.error("Test suite encountered a fatal error:", err);
  process.exit(1);
});
