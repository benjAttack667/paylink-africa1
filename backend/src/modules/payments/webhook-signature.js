import crypto from "node:crypto";

function toBuffer(value) {
  return Buffer.from(String(value ?? ""), "utf8");
}

function safeCompare(left, right) {
  const leftBuffer = toBuffer(left);
  const rightBuffer = toBuffer(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function isValidFlutterwaveWebhookSignature(req, secretHash) {
  if (!secretHash) {
    return false;
  }

  const signedHeader = req.get("flutterwave-signature");

  if (signedHeader) {
    const rawBody = typeof req.rawBody === "string" ? req.rawBody : "";
    const expectedSignature = crypto
      .createHmac("sha256", secretHash)
      .update(rawBody)
      .digest("base64");

    return safeCompare(expectedSignature, signedHeader);
  }

  const legacyHeader = req.get("verif-hash");

  if (legacyHeader) {
    return safeCompare(secretHash, legacyHeader);
  }

  return false;
}
