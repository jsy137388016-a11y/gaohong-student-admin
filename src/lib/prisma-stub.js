// Stub for @prisma/client binary runtime
// Used in Cloudflare Workers build to prevent node:sqlite from being bundled.
// At runtime in Cloudflare Workers, the D1 client (d1-prisma.ts) is used instead.
module.exports = {};
