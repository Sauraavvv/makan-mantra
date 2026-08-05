import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(email: string, name: string, otp: string) {
  const { error } = await resend.emails.send({
    from: "Makan Mantraa <onboarding@resend.dev>",
    to: email,
    subject: "Your verification code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Hi ${name},</h2>
        <p>Your Makan Mantraa verification code is:</p>
        <h1 style="letter-spacing:8px;font-size:40px;color:#16a34a">${otp}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}

/**
 * Sent when an account is created from the post-property form. The owner never
 * chose a password there, so this link is both how they pick one and how they
 * prove the mailbox is theirs.
 */
export async function sendSetPasswordEmail(email: string, name: string, link: string) {
  const { error } = await resend.emails.send({
    from: "Makan Mantraa <onboarding@resend.dev>",
    to: email,
    subject: "Set your Makan Mantraa password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Hi ${name},</h2>
        <p>Your Makan Mantraa account is ready. Set a password to finish signing up
        and to track the property you just posted.</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#0A2036;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
            Set your password
          </a>
        </p>
        <p>This link expires in <strong>24 hours</strong>.</p>
        <p>If you didn't post a property with us, ignore this email.</p>
      </div>
    `,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
