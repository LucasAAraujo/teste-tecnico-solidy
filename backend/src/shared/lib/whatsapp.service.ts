import { env } from '../../config/env';

export interface SignatureWhatsAppPayload {
  phone: string;
  signerName: string;
  contractTitle: string;
  signUrl: string;
  expiresAt: Date;
}

export async function sendSignatureWhatsApp(payload: SignatureWhatsAppPayload): Promise<void> {
  if (!env.WHATSAPP_API_URL || !env.WHATSAPP_API_KEY) {
    console.warn('[whatsapp] WHATSAPP_API_URL ou WHATSAPP_API_KEY não configurados — mensagem ignorada.');
    return;
  }

  const expiry = payload.expiresAt.toLocaleDateString('pt-BR');
  const text =
    `Olá, *${payload.signerName}*!\n\n` +
    `Você tem uma solicitação de assinatura para o contrato *${payload.contractTitle}*.\n\n` +
    `Acesse o link para assinar:\n${payload.signUrl}\n\n` +
    `_Link válido até ${expiry}._`;

  const response = await fetch(`${env.WHATSAPP_API_URL}/message/sendText/${env.WHATSAPP_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.WHATSAPP_API_KEY,
    },
    body: JSON.stringify({ number: payload.phone, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp API error ${response.status}: ${body}`);
  }
}
