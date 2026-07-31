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
