import "server-only";

export const BETA_FROM = "BoolBul <hello@boolbul.com>";
export const BETA_ADMIN_INBOX = "hello@boolbul.com";

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#2b4cff;padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf8ef;border:3px solid #0a0a0a;box-shadow:6px 6px 0 #0a0a0a">
<tr><td style="padding:20px 24px;border-bottom:3px solid #0a0a0a;background:#ccff00;font-weight:900;font-size:20px;letter-spacing:-.02em">🐦‍🔥 BOOLBUL</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;text-transform:uppercase">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:14px 24px;border-top:3px solid #0a0a0a;font-size:12px;color:#3f3f46">BoolBul · In-app cancellation flows for indie SaaS · <a href="https://boolbul.com" style="color:#0a0a0a">boolbul.com</a></td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;margin:8px 0;padding:12px 18px;background:#0a0a0a;color:#ccff00;font-weight:800;text-decoration:none;border:3px solid #0a0a0a">${esc(label)}</a>`;

export interface ApplicationSummary {
  fullName: string;
  email: string;
  websiteUrl: string;
  appliedAt: string;
  applicationId: string;
}

export function adminAlertEmail(app: ApplicationSummary) {
  const rows = [["Name", app.fullName], ["Email", app.email], ["Website", app.websiteUrl], ["Applied", new Date(app.appliedAt).toUTCString()], ["Application", app.applicationId]]
    .map(([k, v]) => `<tr><td style="padding:6px 10px;border:2px solid #0a0a0a;font-weight:800">${esc(k)}</td><td style="padding:6px 10px;border:2px solid #0a0a0a">${esc(v)}</td></tr>`).join("");
  return {
    subject: `New beta application: ${app.fullName} (${new URL(app.websiteUrl).hostname})`,
    html: layout("New beta application", `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px">${rows}</table>
<p style="font-size:14px">${button(app.websiteUrl, "Open their website")}</p>
<p style="font-size:13px;color:#3f3f46">Approve: Supabase → Table editor → <b>invite_applications</b> → set <b>status</b> to <b>confirmed</b>. Their workspace activates and the welcome email goes out automatically.</p>`),
    text: `New beta application\nName: ${app.fullName}\nEmail: ${app.email}\nWebsite: ${app.websiteUrl}\nApplication: ${app.applicationId}\n\nApprove by setting invite_applications.status = confirmed in Supabase.`,
  };
}

export function welcomeEmail(input: { firstName: string; publicKey: string; trialEndsAt: string | null }) {
  const until = input.trialEndsAt ? new Date(input.trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "3 months from today";
  return {
    subject: "You're in! Your 3-month free BoolBul pass is active",
    html: layout(`You're in, ${input.firstName}!`, `<p style="font-size:15px;line-height:1.55">Your <b>3-month free BoolBul Pro pass</b> is active until <b>${esc(until)}</b> — unlimited saves, no credit card.</p>
<p style="font-size:14px;margin:16px 0 6px;font-weight:800;text-transform:uppercase">Your public key</p>
<p style="margin:0 0 16px;padding:10px 12px;background:#0a0a0a;color:#ccff00;font-family:Consolas,monospace;font-size:13px;word-break:break-all">${esc(input.publicKey)}</p>
<p style="font-size:14px;line-height:1.55"><b>2-minute setup:</b><br>1. Open your dashboard, pick Dodo Payments or Stripe and reveal your signing secret (server-only, shown once).<br>2. Add the script to your cancel button.<br>3. Add the two server routes from the quickstart.</p>
<p>${button("https://boolbul.com/onboarding", "Finish setup →")}</p>
<p style="font-size:14px"><a href="https://boolbul.com/docs/quickstart" style="color:#0a0a0a;font-weight:800">Quickstart guide</a> · <a href="https://boolbul.com/demo" style="color:#0a0a0a;font-weight:800">See the live demo</a></p>
<p style="font-size:13px;color:#3f3f46">Reply to this email any time — it reaches the founders directly.</p>`),
    text: `You're in, ${input.firstName}!\n\nYour 3-month free BoolBul Pro pass is active until ${until}.\nPublic key: ${input.publicKey}\n\nFinish setup: https://boolbul.com/onboarding\nQuickstart: https://boolbul.com/docs/quickstart`,
  };
}

/** Sends through Resend's REST API. Returns false (never throws) when unconfigured or rejected. */
export async function sendEmail(message: { to: string; subject: string; html: string; text: string; replyTo?: string; idempotencyKey?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[boolbul] RESEND_API_KEY missing; email not sent", { subject: message.subject });
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: BETA_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text, reply_to: message.replyTo ?? BETA_ADMIN_INBOX }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.warn("[boolbul] Resend rejected email", { status: response.status });
    return response.ok;
  } catch (error) {
    console.warn("[boolbul] Resend request failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return false;
  }
}
