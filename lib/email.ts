import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";

const ORG_NAME = "Bangladesh Army - Personnel & Leave Wing";

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function isEmailEnabled(): boolean {
  return (
    process.env.EMAIL_ENABLED === "true" &&
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_USER)
  );
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isEmailEnabled()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER as string,
      pass: process.env.SMTP_PASS as string,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });

  return transporter;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a single email. Never throws — when emailing is disabled or SMTP is
 * misconfigured it logs to the console (dev fallback) and returns { skipped }.
 */
export async function sendEmail(
  message: EmailMessage
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[mail:disabled] to=${message.to} subject="${message.subject}"`);
    console.log(`[mail:disabled] body preview:\n${stripHtml(message.html).slice(0, 400)}`);
    return { ok: false, skipped: true };
  }

  try {
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || `no-reply@army.local`,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    console.log(`[mail:sent] to=${message.to} subject="${message.subject}" id=${info.messageId}`);
    return { ok: true };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    console.error(`[mail:error] to=${message.to} subject="${message.subject}": ${messageText}`);
    return { ok: false, error: messageText };
  }
}

/**
 * Email every user in userIds (deduped). When emailing is disabled this skips
 * the recipient lookup entirely and just logs one line per recipient.
 */
export async function emailUsers(params: {
  userIds: string[];
  subject: string;
  heading: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<void> {
  const ids = [...new Set(params.userIds.filter(Boolean))];
  if (ids.length === 0) return;

  if (!isEmailEnabled()) {
    for (const id of ids) {
      console.log(`[mail:disabled] would-email userId=${id} subject="${params.subject}"`);
    }
    return;
  }

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    });
    for (const user of users) {
      await sendEmail({
        to: user.email,
        subject: params.subject,
        html: emailLayout({
          heading: params.heading,
          paragraphs: params.paragraphs,
          ctaLabel: params.ctaLabel,
          ctaUrl: params.ctaUrl,
        }),
      });
    }
  } catch (error) {
    console.error("[mail:error] failed to resolve recipients:", error);
  }
}

export function emailLayout(params: {
  heading: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const paragraphsHtml = params.paragraphs
    .map((p) => `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(p)}</p>`)
    .join("");

  const ctaHtml = params.ctaLabel && params.ctaUrl
    ? `<p style="margin:20px 0 0 0;text-align:center;">
         <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 22px;border-radius:4px;">${escapeHtml(params.ctaLabel)}</a>
       </p>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:4px;">
            <tr>
              <td style="padding:24px;background:#0f172a;border-radius:4px 4px 0 0;">
                <p style="margin:0;color:#ffffff;font-size:13px;font-weight:bold;letter-spacing:0.5px;">ARMY PERSONNEL &amp; LEAVE SYSTEM</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 14px 0;font-size:18px;color:#0f172a;">${escapeHtml(params.heading)}</h1>
                ${paragraphsHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">${escapeHtml(ORG_NAME)} · This is an automated message, please do not reply.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Human-friendly labels for review/approval decisions. */
export function decisionLabel(decision: string): string {
  switch (decision) {
    case "RECOMMEND":
      return "Recommended";
    case "APPROVE":
      return "Approved";
    case "REJECT":
      return "Rejected";
    case "RETURN_FOR_CORRECTION":
      return "Returned for Correction";
    default:
      return decision;
  }
}
