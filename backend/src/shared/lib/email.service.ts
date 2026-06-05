import nodemailer from 'nodemailer';
import { env } from '../../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export interface SignatureEmailPayload {
  to: string;
  signerName: string;
  contractTitle: string;
  signUrl: string;
  expiresAt: Date;
}

export async function sendSignatureEmail(payload: SignatureEmailPayload): Promise<void> {
  const expiry = payload.expiresAt.toLocaleDateString('pt-BR');

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: payload.to,
    subject: `Assinatura solicitada: ${payload.contractTitle}`,
    html: `
      <p>Olá, <strong>${payload.signerName}</strong>!</p>
      <p>Você tem uma solicitação de assinatura para o contrato <strong>${payload.contractTitle}</strong>.</p>
      <p>
        <a href="${payload.signUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Assinar contrato
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Link válido até ${expiry}.</p>
    `,
  });
}
