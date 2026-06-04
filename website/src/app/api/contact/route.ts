import { NextResponse } from "next/server";

/**
 * POST /api/contact
 * Handles contact form submissions.
 *
 * When Resend is configured (RESEND_API_KEY env var), emails are sent
 * via Resend. Otherwise, submissions are logged server-side so the form
 * still "works" without crashing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    // Basic validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    // Try sending via Resend if configured
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "FutureTalent <noreply@futuretalent.online>",
          to: ["support@futuretalent.online"],
          subject: `[Contact Form] ${subject || "General"} — ${name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #8b5cf6;">New Contact Form Submission</h2>
              <table style="border-collapse: collapse; width: 100%;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; color: #64748b;">Name</td>
                  <td style="padding: 8px;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td>
                  <td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; color: #64748b;">Subject</td>
                  <td style="padding: 8px;">${subject || "General"}</td>
                </tr>
              </table>
              <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <p style="color: #334155; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
                Sent from futuretalent.online contact form
              </p>
            </div>
          `,
          reply_to: email,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("[Contact] Resend API error:", errBody);
        return NextResponse.json(
          { error: "Failed to send email" },
          { status: 500 }
        );
      }

      console.log(`[Contact] ✅ Email sent via Resend from ${name} <${email}>`);
    } else {
      // Fallback: just log the submission (useful until Resend is configured)
      console.log(`[Contact] 📨 Form submission (Resend not configured):`);
      console.log(`  Name: ${name}`);
      console.log(`  Email: ${email}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Message: ${message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contact] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
