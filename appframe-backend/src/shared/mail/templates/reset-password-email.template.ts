export interface ResetPasswordEmailOptions {
  name?: string;
  appUrl?: string;
  resetToken: string;
}

export function getResetPasswordEmailHtml(options: ResetPasswordEmailOptions): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(options.resetToken)}`;
  const salutation = options.name?.trim() ? `Olá, ${options.name.trim()}!` : 'Olá,';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de Senha • AppFrame</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .btn-reset:hover { background-color: #C68E33 !important; }
  </style>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #F3F4F6; -webkit-font-smoothing: antialiased;">

  <!-- Tabela Container Central -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden;">
    
    <!-- 1. Header com Logotipo Centralizado -->
    <tr>
      <td align="center" style="padding: 40px 40px 24px 40px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" valign="middle">
              <!-- SVG do Ícone em Camadas AppFrame -->
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; vertical-align: middle;">
                <path d="M24 32L6 22.5L24 13L42 22.5L24 32Z" fill="#1D2027" fill-opacity="0.9" stroke="#4F4537" stroke-linejoin="round" stroke-width="1.2"/>
                <path d="M24 26L8 17.5L24 9L40 17.5L24 26Z" fill="#272A31" fill-opacity="0.85" stroke="#9B8F7D" stroke-linejoin="round" stroke-opacity="0.7" stroke-width="1.2"/>
                <path d="M24 20L10 12.5L24 5L38 12.5L24 20Z" fill="url(#appframe-amber-grad-reset)" stroke="#FFDEA8" stroke-linejoin="round" stroke-width="1.4"/>
                <defs>
                  <linearGradient id="appframe-amber-grad-reset" x1="10" y1="5" x2="38" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F2BE5E" />
                    <stop offset="1" stop-color="#D4A346" />
                  </linearGradient>
                </defs>
              </svg>
            </td>
            <td align="left" valign="middle" style="padding-left: 12px;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">AppFrame</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- 2. Conteúdo Principal -->
    <tr>
      <td style="padding: 0 44px 40px 44px;">
        
        <!-- Saudação com Nome -->
        <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.5px; text-align: left;">
          ${salutation}
        </h1>

        <!-- Mensagem de Solicitação -->
        <p style="margin: 0 0 32px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 400; color: #374151; line-height: 1.6; text-align: left;">
          Alguém solicitou a redefinição de senha da sua conta no AppFrame.
        </p>

        <!-- Botão Centralizado -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td align="center">
              <a href="${resetLink}" target="_blank" class="btn-reset" style="
                display: inline-block;
                background-color: #D99E41;
                background: linear-gradient(180deg, #E2A84B 0%, #D49B3C 100%);
                color: #111827;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 16px;
                font-weight: 700;
                text-align: center;
                text-decoration: none;
                padding: 14px 36px;
                border-radius: 8px;
                box-shadow: 0 4px 14px rgba(217, 158, 65, 0.28);
                letter-spacing: -0.2px;
              ">
                Redefinir Minha Senha
              </a>
            </td>
          </tr>
        </table>

        <!-- Link Copiável -->
        <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #6B7280; text-align: center; line-height: 1.5; word-break: break-all;">
          <span style="color: #6B7280; font-weight: 500;">Link para copiar e colar:</span><br>
          <a href="${resetLink}" style="color: #B8851B; text-decoration: underline;">${resetLink}</a>
        </p>

        <!-- Informação de Validade (Itálico) -->
        <p style="margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-style: italic; color: #4B5563; text-align: center; line-height: 1.6;">
          Este link é válido por 1 hora e só pode ser utilizado uma única vez.
        </p>

        <!-- Aviso de Segurança e Encerramento -->
        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.6; text-align: left;">
          Se você não solicitou esta alteração, pode ignorar este e-mail com segurança ou entrar em contato conosco. Sua senha não será alterada até que você crie uma nova senha.
        </p>

      </td>
    </tr>

  </table>

  <!-- Rodapé Institucional -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 24px auto 0 auto;">
    <tr>
      <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9CA3AF; text-align: center; line-height: 1.5;">
        AppFrame © 2026 • Executive Video Intelligence<br>
        Esta é uma mensagem automática de segurança.
      </td>
    </tr>
  </table>

</body>
</html>`;
}
