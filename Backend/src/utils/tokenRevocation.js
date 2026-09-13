/**
 * Token Revocation Store
 *
 * Manages revoked JWT tokens in memory with automatic TTL cleanup.
 *
 * NOTE ON DEPLOYMENT ARCHITECTURE:
 * This in-memory revocation store is optimized for single-instance Node.js deployments
 * without requiring external infrastructure (e.g. Redis).
 * For multi-instance distributed cluster deployments behind a load balancer, this module
 * should be adapted to use a shared Redis cache or a database-backed revoked_tokens table.
 */

const revokedTokens = new Map();

/**
 * Revokes a JWT token by adding it to the revocation map with its expiration time.
 * @param {string} token - The raw JWT token string
 * @param {number} expiresAtMs - The timestamp (in ms) when the token naturally expires
 */
export const revokeToken = (token, expiresAtMs = Date.now() + 24 * 60 * 60 * 1000) => {
  if (!token || typeof token !== 'string') return;
  revokedTokens.set(token, expiresAtMs);
};

/**
 * Checks if a token has been revoked.
 * Automatically removes expired tokens encountered during check.
 * @param {string} token - The raw JWT token string
 * @returns {boolean} True if the token is revoked and not yet expired
 */
export const isTokenRevoked = (token) => {
  if (!token || typeof token !== 'string') return false;

  if (!revokedTokens.has(token)) {
    return false;
  }

  const expiresAtMs = revokedTokens.get(token);
  if (Date.now() > expiresAtMs) {
    revokedTokens.delete(token);
    return false;
  }

  return true;
};

/**
 * Purges all expired tokens from the revocation store.
 */
export const purgeExpiredTokens = () => {
  const now = Date.now();
  for (const [token, expiresAtMs] of revokedTokens.entries()) {
    if (now > expiresAtMs) {
      revokedTokens.delete(token);
    }
  }
};

/**
 * Clears all revoked tokens (used primarily for test isolation).
 */
export const clearRevocationList = () => {
  revokedTokens.clear();
};

// Periodic background cleanup every 15 minutes
setInterval(purgeExpiredTokens, 15 * 60 * 1000).unref();

export default {
  revokeToken,
  isTokenRevoked,
  purgeExpiredTokens,
  clearRevocationList
};
