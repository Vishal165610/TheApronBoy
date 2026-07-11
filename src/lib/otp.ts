// SERVER-ONLY.
import crypto from "node:crypto";

const OTP_PEPPER = process.env.OTP_PEPPER;
if (!OTP_PEPPER) throw new Error("OTP_PEPPER is not set");

// Cryptographically secure 6-digit code (not Math.random — that's predictable).
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// We never store the OTP in plaintext — only this HMAC digest, keyed with a
// server-only secret (the "pepper"). Even a full DB leak doesn't expose codes.
export function hashOtp(email: string, code: string): string {
  return crypto.createHmac("sha256", OTP_PEPPER!).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHmac("sha256", OTP_PEPPER!).update(token).digest("hex");
}

// Calls EmailJS's REST API directly from the server, using the private key
// as `accessToken`. This means the OTP is embedded server-side only — it
// never touches the browser before the user reads it in their inbox.
export async function sendOtpEmail(params: {
  toEmail: string;
  code: string;
  purposeLabel: string;
  expiryMinutes: number;
}) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID_OTP;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error("EmailJS is not configured");
  }

  const templateParams = {
    to_email: params.toEmail,
    otp_code: params.code,
    purpose_label: params.purposeLabel,
    expiry_minutes: params.expiryMinutes,
    app_name: "Edurack",
  };

  // Log exactly what we're sending — this is the ground truth for whether
  // the OTP code is actually reaching EmailJS with the right variable name.
  console.log("[sendOtpEmail] service:", serviceId, "template:", templateId);
  console.log("[sendOtpEmail] template_params:", { ...templateParams, otp_code: `${params.code} (hidden in prod)` });

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: templateParams,
    }),
  });

  const responseText = await res.text();
  console.log("[sendOtpEmail] EmailJS response:", res.status, responseText);

  if (!res.ok) {
    throw new Error(`EmailJS send failed: ${res.status} ${responseText}`);
  }
}