import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

type EmailAttachment = {
  filename: string;
  contentType?: string;
  content: string;
};

type SendEmailBody = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function allValidEmails(emails: string[] = []): boolean {
  return emails.every((email) => emailPattern.test(email));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendEmailBody;
    const to = body.to || [];
    const cc = body.cc || [];
    const bcc = body.bcc || [];

    if (!to.length) {
      return NextResponse.json({ error: 'At least one recipient is required.' }, { status: 400 });
    }

    if (!body.subject?.trim()) {
      return NextResponse.json({ error: 'Email subject is required.' }, { status: 400 });
    }

    if (!body.html?.trim()) {
      return NextResponse.json({ error: 'Email body is required.' }, { status: 400 });
    }

    if (!allValidEmails(to) || !allValidEmails(cc) || !allValidEmails(bcc)) {
      return NextResponse.json({ error: 'One or more email addresses are invalid.' }, { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    const secure = process.env.SMTP_SECURE === 'true';

    if (!host || !user || !pass || !from) {
      return NextResponse.json(
        { error: 'SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const attachments =
      body.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, 'base64'),
        contentType: attachment.contentType || 'application/octet-stream',
      })) || [];

    await transporter.sendMail({
      from,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject: body.subject,
      html: body.html,
      text: body.text || undefined,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email send failed:', error);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
}
