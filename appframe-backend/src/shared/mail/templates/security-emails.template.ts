export interface SecurityEmailOptions {
  name?: string;
  appUrl?: string;
  date?: Date | string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  googleEmail?: string;
  revokedCount?: number;
}

interface BaseLayoutOptions {
  subjectTitle: string;
  name?: string;
  headlineMessage: string;
  badge?: {
    text: string;
    bg: string;
    color: string;
    border?: string;
  };
  detailRows?: Array<{ label: string; value: string }>;
  callout?: {
    type?: 'info' | 'warning' | 'success' | 'neutral';
    text: string;
  };
  button?: {
    text: string;
    url: string;
  };
  secondaryText?: string;
  securityNotice: string;
}

export function formatBrazilianDateTime(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  try {
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    return `${formatted} (Horário de Brasília)`;
  } catch {
    return date.toLocaleString('pt-BR');
  }
}

function renderSecurityEmailBase(options: BaseLayoutOptions): string {
  const salutation = options.name?.trim() ? `Olá, ${options.name.trim()}!` : 'Olá,';

  // Renderização das linhas de detalhes (se existirem)
  let detailRowsHtml = '';
  if (options.detailRows && options.detailRows.length > 0) {
    const rows = options.detailRows
      .map(
        (row, index) => `
        <tr>
          <td style="padding: 9px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 500; color: #6B7280; ${
            index < options.detailRows!.length - 1 ? 'border-bottom: 1px solid #F3F4F6;' : ''
          }">
            ${row.label}
          </td>
          <td align="right" style="padding: 9px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #111827; text-align: right; ${
            index < options.detailRows!.length - 1 ? 'border-bottom: 1px solid #F3F4F6;' : ''
          }">
            ${row.value}
          </td>
        </tr>`,
      )
      .join('');

    detailRowsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 28px 0; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; padding: 10px 18px;">
        ${rows}
      </table>
    `;
  }

  // Badge no topo do conteúdo
  let badgeHtml = '';
  if (options.badge) {
    badgeHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
        <tr>
          <td style="background-color: ${options.badge.bg}; color: ${options.badge.color}; border: ${
            options.badge.border || 'none'
          }; border-radius: 20px; padding: 6px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;">
            ${options.badge.text}
          </td>
        </tr>
      </table>
    `;
  }

  // Caixa de Callout / Destaque
  let calloutHtml = '';
  if (options.callout) {
    let calloutBg = '#F3F4F6';
    let calloutBorder = '#E5E7EB';
    let calloutTextColor = '#374151';

    if (options.callout.type === 'warning') {
      calloutBg = '#FEF3C7';
      calloutBorder = '#FDE68A';
      calloutTextColor = '#92400E';
    } else if (options.callout.type === 'success') {
      calloutBg = '#ECFDF5';
      calloutBorder = '#A7F3D0';
      calloutTextColor = '#065F46';
    } else if (options.callout.type === 'info') {
      calloutBg = '#EFF6FF';
      calloutBorder = '#BFDBFE';
      calloutTextColor = '#1E40AF';
    }

    calloutHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px 0; background-color: ${calloutBg}; border: 1px solid ${calloutBorder}; border-radius: 10px; padding: 14px 18px;">
        <tr>
          <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${calloutTextColor}; line-height: 1.55; text-align: left;">
            ${options.callout.text}
          </td>
        </tr>
      </table>
    `;
  }

  // Botão de ação (se aplicável)
  let buttonHtml = '';
  if (options.button) {
    buttonHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 4px 0 28px 0;">
        <tr>
          <td align="center">
            <a href="${options.button.url}" target="_blank" class="btn-primary" style="
              display: inline-block;
              background-color: #D99E41;
              background: linear-gradient(180deg, #E2A84B 0%, #D49B3C 100%);
              color: #111827;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 15px;
              font-weight: 700;
              text-align: center;
              text-decoration: none;
              padding: 13px 32px;
              border-radius: 8px;
              box-shadow: 0 4px 14px rgba(217, 158, 65, 0.28);
              letter-spacing: -0.2px;
            ">
              ${options.button.text}
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  // Texto secundário opcional
  let secondaryHtml = '';
  if (options.secondaryText) {
    secondaryHtml = `
      <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #4B5563; line-height: 1.6; text-align: left;">
        ${options.secondaryText}
      </p>
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.subjectTitle}</title>
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
    .btn-primary:hover { background-color: #C68E33 !important; }
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
                <path d="M24 20L10 12.5L24 5L38 12.5L24 20Z" fill="url(#appframe-amber-grad-security)" stroke="#FFDEA8" stroke-linejoin="round" stroke-width="1.4"/>
                <defs>
                  <linearGradient id="appframe-amber-grad-security" x1="10" y1="5" x2="38" y2="20" gradientUnits="userSpaceOnUse">
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
        
        ${badgeHtml}

        <!-- Saudação com Nome -->
        <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.5px; text-align: left;">
          ${salutation}
        </h1>

        <!-- Mensagem Principal -->
        <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 400; color: #374151; line-height: 1.6; text-align: left;">
          ${options.headlineMessage}
        </p>

        ${calloutHtml}

        ${detailRowsHtml}

        ${buttonHtml}

        ${secondaryHtml}

        <!-- Aviso de Segurança e Encerramento -->
        <div style="margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid #F3F4F6;">
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #4B5563; line-height: 1.6; text-align: left;">
            ${options.securityNotice}
          </p>
        </div>

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

// =============================================================================
// 1. Senha Alterada
// =============================================================================
export function getPasswordChangedEmailHtml(options: SecurityEmailOptions = {}): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const dateStr = formatBrazilianDateTime(options.date);

  const detailRows = [
    { label: 'Status da Conta', value: 'Senha alterada com sucesso' },
    { label: 'Data e Hora', value: dateStr },
  ];

  if (options.deviceName) {
    detailRows.push({ label: 'Dispositivo / Navegador', value: options.deviceName });
  } else if (options.userAgent) {
    detailRows.push({ label: 'Navegador', value: options.userAgent.slice(0, 45) });
  }

  if (options.ipAddress) {
    detailRows.push({ label: 'Endereço IP', value: options.ipAddress });
  }

  return renderSecurityEmailBase({
    subjectTitle: 'Senha Alterada com Sucesso • AppFrame',
    name: options.name,
    headlineMessage: 'A senha da sua conta no AppFrame foi alterada recentemente.',
    badge: {
      text: 'Senha Atualizada',
      bg: '#FEF3C7',
      color: '#92400E',
      border: '1px solid #FDE68A',
    },
    detailRows,
    callout: {
      type: 'info',
      text: 'Por medida de proteção, todas as outras sessões ativas da sua conta foram desconectadas automaticamente.',
    },
    button: {
      text: 'Acessar Minha Conta',
      url: `${appUrl}/login`,
    },
    securityNotice:
      'Se você realizou esta alteração, nenhuma ação adicional é necessária. Caso você <strong>NÃO</strong> tenha solicitado ou não reconheça essa mudança de senha, redefina sua senha imediatamente na tela de login ou entre em contato com nossa equipe.',
  });
}

// =============================================================================
// 2. 2FA Ativado
// =============================================================================
export function getTwoFactorEnabledEmailHtml(options: SecurityEmailOptions = {}): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const dateStr = formatBrazilianDateTime(options.date);

  const detailRows = [
    { label: 'Autenticação em Duas Etapas', value: 'Ativada e Protegida' },
    { label: 'Método de Proteção', value: 'Aplicativo Autenticador (TOTP)' },
    { label: 'Data e Hora', value: dateStr },
  ];

  if (options.deviceName) {
    detailRows.push({ label: 'Dispositivo Solicitante', value: options.deviceName });
  }

  return renderSecurityEmailBase({
    subjectTitle: 'Autenticação em Duas Etapas (2FA) Ativada • AppFrame',
    name: options.name,
    headlineMessage: 'A autenticação em duas etapas (2FA) foi ativada com sucesso na sua conta AppFrame.',
    badge: {
      text: 'Proteção 2FA Ativada',
      bg: '#ECFDF5',
      color: '#065F46',
      border: '1px solid #A7F3D0',
    },
    detailRows,
    callout: {
      type: 'success',
      text: 'Sua conta agora conta com uma camada adicional de segurança. A cada novo login, além da senha, será solicitado o código de 6 dígitos gerado pelo seu aplicativo.',
    },
    secondaryText:
      'Recomendamos que você armazene seus códigos de recuperação de emergência em um local seguro, fora do dispositivo onde o aplicativo autenticador está instalado.',
    button: {
      text: 'Ver Configurações de Segurança',
      url: `${appUrl}/settings`,
    },
    securityNotice:
      'Se você realizou esta ativação, sua conta agora está blindada. Se você <strong>NÃO</strong> realizou esta alteração, acesse imediatamente sua conta e entre em contato conosco.',
  });
}

// =============================================================================
// 3. 2FA Desativado
// =============================================================================
export function getTwoFactorDisabledEmailHtml(options: SecurityEmailOptions = {}): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const dateStr = formatBrazilianDateTime(options.date);

  const detailRows = [
    { label: 'Autenticação em Duas Etapas', value: 'Desativada' },
    { label: 'Nível de Proteção Atual', value: 'Básico (apenas senha)' },
    { label: 'Data e Hora', value: dateStr },
  ];

  if (options.deviceName) {
    detailRows.push({ label: 'Dispositivo', value: options.deviceName });
  }

  return renderSecurityEmailBase({
    subjectTitle: 'Aviso de Segurança: 2FA Desativado • AppFrame',
    name: options.name,
    headlineMessage: 'A autenticação em duas etapas (2FA) foi desativada na sua conta AppFrame.',
    badge: {
      text: 'Aviso de Segurança: 2FA Desativado',
      bg: '#FEE2E2',
      color: '#991B1B',
      border: '1px solid #FECACA',
    },
    detailRows,
    callout: {
      type: 'warning',
      text: 'Atenção: Sua conta não está mais protegida pela verificação em duas etapas. Recomendamos fortemente manter essa proteção sempre ativa para resguardar seus dados e vídeos.',
    },
    button: {
      text: 'Reativar 2FA Agora',
      url: `${appUrl}/settings`,
    },
    securityNotice:
      'Se você desativou o 2FA intencionalmente, recomendamos reativá-lo assim que possível. Se você <strong>NÃO</strong> realizou essa desativação, sua conta pode estar em risco. Altere sua senha imediatamente e reative o segundo fator de autenticação.',
  });
}

// =============================================================================
// 4. Vinculação do Google
// =============================================================================
export function getGoogleLinkedEmailHtml(options: SecurityEmailOptions = {}): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const dateStr = formatBrazilianDateTime(options.date);

  const detailRows = [
    { label: 'Conta Google Vinculada', value: options.googleEmail || 'Conta Google' },
    { label: 'Data e Hora', value: dateStr },
    { label: 'Status da Conexão', value: 'Ativa' },
  ];

  return renderSecurityEmailBase({
    subjectTitle: 'Conta Google Vinculada com Sucesso • AppFrame',
    name: options.name,
    headlineMessage: 'Sua conta do Google foi vinculada ao seu perfil no AppFrame.',
    badge: {
      text: 'Google Conectado',
      bg: '#EFF6FF',
      color: '#1E40AF',
      border: '1px solid #BFDBFE',
    },
    detailRows,
    callout: {
      type: 'info',
      text: 'Agora você pode acessar o AppFrame em um clique utilizando o botão "Continuar com o Google", ou utilizar seu e-mail e senha normalmente.',
    },
    button: {
      text: 'Acessar Minha Conta',
      url: `${appUrl}/settings`,
    },
    securityNotice:
      'Se você vinculou esta conta Google, nenhuma ação é necessária. Se você <strong>NÃO</strong> reconhece essa vinculação, acesse as Configurações de Segurança do AppFrame e clique em "Desvincular Google" para revogar o acesso imediatamente.',
  });
}

// =============================================================================
// 5. Desvinculação do Google
// =============================================================================
export function getGoogleUnlinkedEmailHtml(options: SecurityEmailOptions = {}): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const dateStr = formatBrazilianDateTime(options.date);

  const detailRows = [
    { label: 'Vínculo com Google', value: 'Desconectado' },
    { label: 'Método de Acesso Ativo', value: 'E-mail e Senha Local' },
    { label: 'Data e Hora', value: dateStr },
  ];

  return renderSecurityEmailBase({
    subjectTitle: 'Conta Google Desvinculada • AppFrame',
    name: options.name,
    headlineMessage: 'A sua conta Google foi desvinculada do seu perfil no AppFrame.',
    badge: {
      text: 'Google Desvinculado',
      bg: '#F3F4F6',
      color: '#374151',
      border: '1px solid #E5E7EB',
    },
    detailRows,
    callout: {
      type: 'neutral',
      text: 'O login rápido com a conta Google não está mais habilitado para este perfil. Para acessar o AppFrame, utilize o seu e-mail e sua senha cadastrada.',
    },
    button: {
      text: 'Acessar Configurações',
      url: `${appUrl}/settings`,
    },
    securityNotice:
      'Se foi você quem realizou a desvinculação, pode desconsiderar esta mensagem. Se você <strong>NÃO</strong> solicitou essa alteração, acesse sua conta e verifique seus acessos e senha imediatamente.',
  });
}

// =============================================================================
// 6. Exclusão de Conta
// =============================================================================
export function getAccountDeletedEmailHtml(options: SecurityEmailOptions = {}): string {
  const dateStr = formatBrazilianDateTime(options.date);

  const detailRows = [
    { label: 'Status da Conta', value: 'Excluída Permanentemente' },
    { label: 'Data do Encerramento', value: dateStr },
    { label: 'Dados Pessoais e Ficheiros', value: 'Removidos em conformidade com a LGPD' },
  ];

  return renderSecurityEmailBase({
    subjectTitle: 'Confirmação de Exclusão de Conta • AppFrame',
    name: options.name,
    headlineMessage: 'Confirmamos que a sua conta no AppFrame foi excluída permanentemente a seu pedido.',
    badge: {
      text: 'Conta Encerrada',
      bg: '#FEE2E2',
      color: '#991B1B',
      border: '1px solid #FECACA',
    },
    detailRows,
    callout: {
      type: 'neutral',
      text: 'Todos os seus dados de perfil, marcas d\'água salvas, fila de renderizações de vídeos e sessões ativas foram apagados dos nossos servidores de forma irreversível.',
    },
    secondaryText:
      'Agradecemos pelo tempo em que esteve conosco no AppFrame. Caso tenha sido um engano ou deseje retornar futuramente, as portas estarão sempre abertas para criar uma nova conta na plataforma.',
    securityNotice:
      'Esta é uma notificação final de encerramento da sua conta. Se você <strong>NÃO</strong> solicitou a exclusão e acredita ter sido vítima de um acesso indevido, entre em contato imediatamente com nossa equipe.',
  });
}

// =============================================================================
// 7. Desconectar Todos os Dispositivos
// =============================================================================
export function getSessionsRevokedEmailHtml(options: SecurityEmailOptions = {}): string {
  const appUrl = (options.appUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const dateStr = formatBrazilianDateTime(options.date);

  const countText =
    options.revokedCount && options.revokedCount > 0
      ? `${options.revokedCount} outro(s) dispositivo(s)`
      : 'Todas as outras sessões';

  const detailRows = [
    { label: 'Dispositivos Desconectados', value: countText },
    { label: 'Sessão Atual', value: 'Mantida ativa neste navegador' },
    { label: 'Data e Hora', value: dateStr },
  ];

  if (options.deviceName) {
    detailRows.push({ label: 'Dispositivo Solicitante', value: options.deviceName });
  }

  return renderSecurityEmailBase({
    subjectTitle: 'Outros Dispositivos Desconectados • AppFrame',
    name: options.name,
    headlineMessage: 'Todos os outros dispositivos conectados à sua conta AppFrame foram desconectados com sucesso.',
    badge: {
      text: 'Sessões Revogadas',
      bg: '#FEF3C7',
      color: '#92400E',
      border: '1px solid #FDE68A',
    },
    detailRows,
    callout: {
      type: 'info',
      text: 'Qualquer outro computador, celular ou tablet que estivesse com sua conta conectada foi desconectado e precisará de uma nova autenticação para voltar a acessar a plataforma.',
    },
    button: {
      text: 'Ver Sessões Ativas',
      url: `${appUrl}/settings`,
    },
    securityNotice:
      'Se você realizou essa desconexão, nenhuma ação adicional é necessária. Caso você <strong>NÃO</strong> tenha solicitado desconectar seus outros dispositivos, recomendamos alterar sua senha imediatamente.',
  });
}
