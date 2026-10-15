export interface WelcomeEmailOptions {
  name?: string;
  appUrl?: string;
}

export function getWelcomeEmailHtml(options: WelcomeEmailOptions = {}): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const accessUrl = `${appUrl}/login`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao AppFrame</title>
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
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .btn-primary:hover { background-color: #E0B04A !important; }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #F3F4F6; -webkit-font-smoothing: antialiased;">

  <!-- Tabela Container Central -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E5E7EB; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); overflow: hidden;">
    
    <!-- 1. Header com Logotipo AppFrame -->
    <tr>
      <td align="center" style="padding: 32px 24px 20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" valign="middle">
              <!-- SVG do Ícone em Camadas AppFrame -->
              <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; vertical-align: middle;">
                <!-- Base Inferior -->
                <path d="M24 32L6 22.5L24 13L42 22.5L24 32Z" fill="#1D2027" fill-opacity="0.9" stroke="#4F4537" stroke-linejoin="round" stroke-width="1.2"/>
                <!-- Camada Intermediária -->
                <path d="M24 26L8 17.5L24 9L40 17.5L24 26Z" fill="#272A31" fill-opacity="0.85" stroke="#9B8F7D" stroke-linejoin="round" stroke-opacity="0.7" stroke-width="1.2"/>
                <!-- Camada Superior Dourada Oficial -->
                <path d="M24 20L10 12.5L24 5L38 12.5L24 20Z" fill="url(#appframe-amber-grad)" stroke="#FFDEA8" stroke-linejoin="round" stroke-width="1.4"/>
                <defs>
                  <linearGradient id="appframe-amber-grad" x1="10" y1="5" x2="38" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F2BE5E" />
                    <stop offset="1" stop-color="#D4A346" />
                  </linearGradient>
                </defs>
              </svg>
            </td>
            <td align="left" valign="middle" style="padding-left: 10px;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">AppFrame</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- 2. Hero Card com Banner Escuro e Glow Dourado Âmbar -->
    <tr>
      <td style="padding: 0 24px 28px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="
              background: #0E0F12;
              background-color: #0E0F12;
              background-image: 
                radial-gradient(circle at 85% 15%, rgba(212, 163, 70, 0.48) 0%, rgba(212, 163, 70, 0.15) 35%, transparent 65%),
                radial-gradient(circle at 15% 85%, rgba(229, 169, 60, 0.42) 0%, rgba(229, 169, 60, 0.12) 35%, transparent 60%),
                radial-gradient(circle at 50% 50%, rgba(212, 163, 70, 0.08) 0%, transparent 70%);
              border-radius: 18px;
              padding: 56px 20px 48px 20px;
              text-align: center;
              box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.6);
            ">
              <!-- "Bem-vindo ao" em tom âmbar -->
              <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 600; color: #D4A346; letter-spacing: -0.2px;">
                Bem-vindo ao
              </p>
              
              <!-- Título "AppFrame" Principal -->
              <h1 style="margin: 0 0 26px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 52px; font-weight: 800; color: #FFFFFF; letter-spacing: -1.2px; line-height: 1.05;">
                AppFrame
              </h1>

              <!-- Subtítulo -->
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 400; color: #E5E7EB; line-height: 1.45;">
                A maneira inteligente<br/>de criar e editar seus vídeos
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- 3. Lista de Recursos e Benefícios -->
    <tr>
      <td align="center" style="padding: 0 32px 10px 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.8;">
              <p style="margin: 0 0 8px 0;">
                <strong style="color: #111827; font-weight: 700;">Importação fácil</strong> de YouTube, Instagram e TikTok.
              </p>
              <p style="margin: 0 0 8px 0;">
                <strong style="color: #111827; font-weight: 700;">Crie Shorts, Reels e afins</strong> dinâmicos e rápidos.
              </p>
              <p style="margin: 0;">
                <strong style="color: #111827; font-weight: 700;">Legendas automáticas</strong> geradas por IA ou legenda fixa.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- 4. Divisor Sutil -->
    <tr>
      <td style="padding: 24px 32px 24px 32px;">
        <div style="height: 1px; background-color: #E5E7EB; width: 100%; margin: 0 auto;"></div>
      </td>
    </tr>

    <!-- 5. Seção de Confirmação & Botão na Cor do Sistema -->
    <tr>
      <td align="center" style="padding: 0 32px 36px 32px;">
        <!-- Título "Sua conta está pronta" -->
        <h2 style="margin: 0 0 22px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.4px;">
          Sua conta está pronta
        </h2>

        <!-- Botão CTA Oficial na Cor Primária do Sistema (#D4A346) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td align="center" bgcolor="#D4A346" style="border-radius: 10px; background-color: #D4A346; box-shadow: 0 4px 18px rgba(212, 163, 70, 0.35);">
              <a href="${accessUrl}" target="_blank" class="btn-primary" style="
                display: inline-block;
                padding: 14px 40px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 15px;
                font-weight: 700;
                color: #0F1115;
                text-decoration: none;
                border-radius: 10px;
                letter-spacing: 0.2px;
                border: 1px solid rgba(255, 255, 255, 0.2);
              ">
                Acessar Plataforma
              </a>
            </td>
          </tr>
        </table>

        <!-- Link Alternativo -->
        <p style="margin: 18px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
          Se o botão não funcionar, copie e cole o link no seu navegador:<br/>
          <a href="${accessUrl}" target="_blank" style="color: #D4A346; text-decoration: underline; word-break: break-all;">
            ${accessUrl}
          </a>
        </p>
      </td>
    </tr>

    <!-- 6. Rodapé -->
    <tr>
      <td align="center" style="padding: 20px 24px 28px 24px; background-color: #FAFAFA; border-top: 1px solid #F3F4F6;">
        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #9CA3AF; line-height: 1.6;">
          © 2026 AppFrame. Todos os direitos reservados.<br/>
          Você recebeu esta mensagem porque criou uma conta na plataforma AppFrame.
        </p>
      </td>
    </tr>

  </table>

</body>
</html>`;
}
