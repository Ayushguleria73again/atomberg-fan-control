export const SESSION_COOKIE_NAME = "fc_session";
const AUTH_SALT = "_fancontrol_secure_auth_v1";

/**
 * Computes a deterministic SHA-256 session token using the Web Crypto API
 * (Compatible with Edge Middleware, Serverless, and Node.js runtimes).
 */
export async function generateSessionToken(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode + AUTH_SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates whether the incoming cookie token matches the server's APP_PASSCODE.
 */
export async function isValidSession(
  cookieToken: string | undefined
): Promise<boolean> {
  const serverPasscode = process.env.APP_PASSCODE;

  // If no passcode is configured in environment, permit access
  if (!serverPasscode) {
    return true;
  }

  if (!cookieToken || typeof cookieToken !== "string") {
    return false;
  }

  const expectedToken = await generateSessionToken(serverPasscode.trim());

  // Constant-time comparison
  if (cookieToken.length !== expectedToken.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }

  return mismatch === 0;
}
