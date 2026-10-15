export interface ResetPasswordEmailOptions {
  name?: string;
  appUrl?: string;
  resetToken: string;
}

export function getResetPasswordEmailHtml(options: ResetPasswordEmailOptions): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(options.resetToken)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha • AppFrame</title>
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
<body style="margin: 0; padding: 40px 12px; background-color: #F8F9FA; -webkit-font-smoothing: antialiased;">

  <!-- Tabela Container Central -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E5E7EB; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02); overflow: hidden;">
    
    <!-- 1. Header com Logotipo AppFrame -->
    <tr>
      <td align="center" style="padding: 44px 32px 28px 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" valign="middle">
              <!-- SVG do Ícone em Camadas AppFrame -->
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; vertical-align: middle;">
                <!-- Base Inferior -->
                <path d="M24 32L6 22.5L24 13L42 22.5L24 32Z" fill="#1D2027" fill-opacity="0.9" stroke="#4F4537" stroke-linejoin="round" stroke-width="1.2"/>
                <!-- Camada Intermediária -->
                <path d="M24 26L8 17.5L24 9L40 17.5L24 26Z" fill="#272A31" fill-opacity="0.85" stroke="#9B8F7D" stroke-linejoin="round" stroke-opacity="0.7" stroke-width="1.2"/>
                <!-- Camada Superior Dourada Oficial -->
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

    <!-- 2. Título "Redefinir senha" -->
    <tr>
      <td align="center" style="padding: 10px 32px 14px 32px;">
        <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 34px; font-weight: 800; color: #111827; letter-spacing: -1px; line-height: 1.15;">
          Redefinir senha
        </h1>
      </td>
    </tr>

    <!-- 3. Mensagem explicativa -->
    <tr>
      <td align="center" style="padding: 0 40px 32px 40px;">
        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 400; color: #4B5563; line-height: 1.5; text-align: center;">
          Recebemos uma solicitação para redefinir a sua senha.
        </p>
      </td>
    </tr>

    <!-- 4. Botão de Ação "Redefinir senha" -->
    <tr>
      <td align="center" style="padding: 0 32px 36px 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 380px;">
          <tr>
            <td align="center">
              <a href="${resetLink}" target="_blank" class="btn-reset" style="
                display: block;
                width: 100%;
                box-sizing: border-box;
                background-color: #D99E41;
                background: linear-gradient(180deg, #E2A84B 0%, #D49B3C 100%);
                color: #111827;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 17px;
                font-weight: 700;
                text-align: center;
                text-decoration: none;
                padding: 16px 28px;
                border-radius: 12px;
                box-shadow: 0 4px 14px rgba(217, 158, 65, 0.28);
                letter-spacing: -0.2px;
              ">
                Redefinir senha
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- 5. Aviso de Expiração & Segurança -->
    <tr>
      <td align="center" style="padding: 0 40px 40px 40px;">
        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 400; color: #6B7280; line-height: 1.6; text-align: center;">
          O link expira em 1 hora. Se você não solicitou, ignore este e-mail.
        </p>
      </td>
    </tr>

  </table>

  <!-- Rodapé Institucional -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 20px auto 0 auto;">
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
