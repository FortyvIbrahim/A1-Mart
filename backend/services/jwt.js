const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// RS256 key pair: JWT_PRIVATE_KEY / JWT_PUBLIC_KEY env vars (PEM text, "\n"
// escapes allowed) or keys/jwt/*.key files (git-ignored).
function loadKey(envName, file) {
  const fromEnv = process.env[envName];
  if (fromEnv) return fromEnv.replace(/\\n/g, "\n");
  return fs.readFileSync(path.resolve(__dirname, "../keys/jwt", file), "utf8");
}
const privateKey = loadKey("JWT_PRIVATE_KEY", "private.key");
const publicKey = loadKey("JWT_PUBLIC_KEY", "public.key");

const algorithm = "RS256";

module.exports = class JWT {
  static sign(payload, expiresIn) {
    return new Promise((resolve, reject) => {
      jwt.sign(
        payload,
        privateKey,
        { expiresIn: expiresIn, algorithm: algorithm },
        (err, token) => {
          if (err) {
            reject(err);
          } else {
            resolve(token);
          }
        }
      );
    });
  }

  static verify(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        publicKey,
        { algorithm: [algorithm] },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded);
          }
        }
      );
    });
  }

  static decode(token) {
    return jwt.decode(token, { complete: true });
  }
};
