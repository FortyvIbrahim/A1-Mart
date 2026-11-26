const { authenticator } = require("otplib");
const crypto = require("crypto");
let QRCode;
try {
  QRCode = require("qrcode");
} catch (err) {
  // QRCode is optional, will handle gracefully
  QRCode = null;
}

// Use the same encryption method as the existing encrypt utility
const SECRET_KEY = "1234567890123456"; // 16 bytes for 128-bit key
const IV = "Info-TechGateWay"; // 16 bytes IV
const ALGORITHM = "aes-128-cbc";

class TOTPService {
  /**
   * Encrypt TOTP secret before storing in database
   */
  static encryptSecret(secret) {
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(SECRET_KEY),
      Buffer.from(IV)
    );
    let encrypted = cipher.update(secret, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }

  /**
   * Decrypt TOTP secret from database
   */
  static decryptSecret(encryptedSecret) {
    if (!encryptedSecret) return null;
    try {
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(SECRET_KEY),
        Buffer.from(IV)
      );
      let decrypted = decipher.update(encryptedSecret, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      return null;
    }
  }

  /**
   * Generate a new TOTP secret
   */
  static generateSecret() {
    return authenticator.generateSecret();
  }

  /**
   * Generate QR code data URL for TOTP setup
   */
  static async generateQRCode(secret, username, issuer = "A1 Stores") {
    const otpauth = authenticator.keyuri(username, issuer, secret);
    try {
      if (!QRCode) {
        // Return the otpauth URL if QRCode library is not available
        return { otpauth, qrCode: null };
      }
      const qrCodeDataURL = await QRCode.toDataURL(otpauth);
      return { otpauth, qrCode: qrCodeDataURL };
    } catch (err) {
      // Return the otpauth URL even if QR code generation fails
      return { otpauth, qrCode: null };
    }
  }

  /**
   * Verify TOTP token
   */
  static verifyToken(secret, token) {
    try {
      return authenticator.verify({ token, secret });
    } catch (err) {
      return false;
    }
  }

  /**
   * Generate TOTP token (for testing purposes)
   */
  static generateToken(secret) {
    return authenticator.generate(secret);
  }
}

module.exports = TOTPService;

