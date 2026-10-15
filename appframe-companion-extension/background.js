/**
 * AppFrame Companion - Background Service Worker
 * Gerencia a extração segura dos cookies de sessão do YouTube e comunicação com o AppFrame.
 */

function formatCookiesToNetscape(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# https://curl.haxx.se/rfc/cookie_spec.html',
    '# Gerado automaticamente pelo AppFrame Companion',
    '',
  ];

  for (const c of cookies) {
    if (!c.name || c.value === undefined) continue;
    const domain = c.domain || '.youtube.com';
    const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const path = c.path || '/';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expiration = c.expirationDate
      ? Math.round(c.expirationDate)
      : Math.floor(Date.now() / 1000) + 31536000;
    lines.push(`${domain}\t${flag}\t${path}\t${secure}\t${expiration}\t${c.name}\t${c.value}`);
  }

  return lines.join('\n');
}

async function extractYouTubeCookies() {
  const [dotYoutube, plainYoutube] = await Promise.all([
    chrome.cookies.getAll({ domain: '.youtube.com' }),
    chrome.cookies.getAll({ domain: 'youtube.com' }),
  ]);

  const map = new Map();
  [...(dotYoutube || []), ...(plainYoutube || [])].forEach((c) => {
    const key = `${c.domain}:${c.path}:${c.name}`;
    if (!map.has(key)) {
      map.set(key, c);
    }
  });

  const allCookies = Array.from(map.values());
  const authKeys = ['LOGIN_INFO', 'SID', 'HSID', 'SSID', 'SAPISID', 'APISID'];
  const hasAuth = allCookies.some((c) => authKeys.includes(c.name));

  return {
    cookies: allCookies,
    hasAuth,
    netscape: formatCookiesToNetscape(allCookies),
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_YOUTUBE_COOKIES') {
    extractYouTubeCookies()
      .then((data) => {
        if (!data.cookies.length) {
          sendResponse({
            success: false,
            error: 'Nenhum cookie do YouTube encontrado no navegador.',
          });
          return;
        }
        sendResponse({
          success: true,
          cookies: data.netscape,
          cookieArray: data.cookies,
          count: data.cookies.length,
          hasAuth: data.hasAuth,
        });
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: err.message || 'Erro ao ler cookies do YouTube.',
        });
      });
    return true; // Mantém o canal aberto para resposta assíncrona
  }

  if (request.action === 'CHECK_YOUTUBE_LOGIN') {
    extractYouTubeCookies()
      .then((data) => {
        sendResponse({
          success: true,
          loggedIn: data.hasAuth,
          count: data.cookies.length,
        });
      })
      .catch(() => {
        sendResponse({ success: false, loggedIn: false, count: 0 });
      });
    return true;
  }

  if (request.action === 'SYNC_TO_SERVER') {
    const serverUrl = (request.serverUrl || 'http://localhost:3000').replace(/\/+$/, '');
    extractYouTubeCookies()
      .then(async (data) => {
        if (!data.cookies.length) {
          sendResponse({
            success: false,
            error: 'Faça login no YouTube neste navegador antes de sincronizar.',
          });
          return;
        }

        try {
          const endpoint = `${serverUrl}/api/v1/media/youtube-cookies`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cookies: data.netscape,
            }),
          });

          const json = await res.json().catch(() => ({}));
          if (res.ok) {
            sendResponse({
              success: true,
              message: json.message || 'Sessão sincronizada com o AppFrame com sucesso!',
              count: data.cookies.length,
            });
          } else {
            sendResponse({
              success: false,
              error: json.message || `Erro do servidor HTTP ${res.status}`,
            });
          }
        } catch (fetchErr) {
          sendResponse({
            success: false,
            error: `Não foi possível conectar ao servidor AppFrame em ${serverUrl}.`,
          });
        }
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: err.message || 'Falha na extração de cookies.',
        });
      });
    return true;
  }
});
