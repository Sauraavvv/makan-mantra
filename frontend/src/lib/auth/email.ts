import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const NAVY = "#0A2036";
const SAFFRON = "#FF7A1A";

/**
 * Mail clients are stuck decades behind browsers: no flexbox, no grid, and
 * stylesheets are stripped. Everything below is tables and inline styles on
 * purpose — it is not how the site is written, and it should not be.
 */
function shell(title: string, body: string) {
  return `
<div style="margin:0;padding:24px 12px;background:#f1f1f1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr>
      <td style="background:${NAVY};padding:26px 32px">
        <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-.3px">
          Makan <span style="color:${SAFFRON}">Mantraa</span>
        </div>
        <div style="margin-top:4px;font-size:12px;color:rgba(255,255,255,.6)">${title}</div>
      </td>
    </tr>
    <tr><td style="padding:32px">${body}</td></tr>
    <tr>
      <td style="background:#fafafa;border-top:1px solid #ececec;padding:20px 32px">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#8a8a8a">
          You are receiving this because you subscribed at makanmantraa.com.<br>
          Not interested any more? Just reply with “unsubscribe” and we will take you off the list.
        </p>
      </td>
    </tr>
  </table>
</div>`;
}

function expectationCard({
  icon,
  title,
  copy,
}: {
  icon: string;
  title: string;
  copy: string;
}) {
  return `
    <td width="33.33%" valign="top" style="padding:0 7px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
             style="border:1px solid #f0dfd4;border-radius:12px;background:#ffffff">
        <tr>
          <td align="center" style="padding:20px 14px 24px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="82" height="82"
                   style="width:82px;height:82px;border-radius:999px;background:#fff1e5;border:1px solid #ffe0c7">
              <tr>
                <td align="center" valign="middle" style="font-size:32px;line-height:1">${icon}</td>
              </tr>
            </table>
            <p style="margin:15px 0 8px;font-size:16px;font-weight:700;line-height:1.3;color:${NAVY}">
              ${title}
            </p>
            <p style="margin:0;font-size:13px;line-height:1.55;color:#3d4654">
              ${copy}
            </p>
          </td>
        </tr>
      </table>
    </td>`;
}

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

/**
 * Welcomes a newsletter subscriber and nudges them towards an account.
 *
 * `createAccountUrl` opens the sign-up modal with their address already filled
 * in, so the link drops them straight into the normal registration flow.
 */
export async function sendNewsletterWelcomeEmail(email: string, createAccountUrl: string) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:23px;line-height:1.3;color:${NAVY};font-weight:700">
      Thanks for subscribing
    </h1>

    <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#3d4654">
      You&rsquo;re on the list. From here on we&rsquo;ll keep you posted on what is
      actually moving in Indian real estate &mdash; no noise, no daily spam.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:26px">
      <tr>
        <td width="27%" valign="middle" style="border-top:1px solid #d9dde6;font-size:1px;line-height:1px">&nbsp;</td>
        <td align="center" valign="middle" style="padding:0 14px;font-size:18px;font-weight:700;line-height:1.35;color:${NAVY};white-space:nowrap">
          Here&rsquo;s what you can expect from us
        </td>
        <td width="27%" valign="middle" style="border-top:1px solid #d9dde6;font-size:1px;line-height:1px">&nbsp;</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 26px">
      <tr>
        ${expectationCard({
          icon: "&#128200;",
          title: "Market Insights",
          copy: "Stay informed with the latest real estate market trends, analysis &amp; updates.",
        })}
        ${expectationCard({
          icon: "&#127968;",
          title: "New Listings",
          copy: "Be the first to know about new properties that match your interest.",
        })}
        ${expectationCard({
          icon: "&#127970;",
          title: "Project Updates",
          copy: "Get updates on new real estate projects and developments.",
        })}
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="background:#f7f9fc;border:1px solid #e6ebf2;border-radius:12px">
      <tr>
        <td style="padding:22px 20px">
          <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${NAVY}">
            Want more than emails?
          </p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#3d4654">
            Create a free account to shortlist properties, save your searches and
            get alerts the moment something matches what you&rsquo;re after.
          </p>
          <a href="${createAccountUrl}"
             style="display:inline-block;background:${SAFFRON};color:#ffffff;padding:13px 26px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700">
            Create my free account &rarr;
          </a>
          <p style="margin:14px 0 0;font-size:12px;color:#8a8a8a">
            Takes under a minute. You&rsquo;ll stay subscribed either way.
          </p>
        </td>
      </tr>
    </table>
  `;

  const { error } = await resend.emails.send({
    from: "Makan Mantraa <onboarding@resend.dev>",
    to: email,
    subject: "Welcome to Makan Mantraa",
    html: shell("Newsletter", body),
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
