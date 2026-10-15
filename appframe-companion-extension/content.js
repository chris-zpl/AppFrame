/**
 * AppFrame Companion - Content Script
 * Estabelece a ponte bidirecional entre o frontend do AppFrame e a extensão.
 */

(function () {
  const EXTENSION_VERSION = '1.0.0';

  // Marca no DOM que a extensão está instalada
  function markInstalled() {
    try {
      document.documentElement.setAttribute('data-appframe-companion-installed', 'true');
      document.documentElement.setAttribute('data-appframe-companion-version', EXTENSION_VERSION);

      // Injeta flag no window da página
      const script = document.createElement('script');
      script.textContent = `
        window.__APPFRAME_COMPANION_INSTALLED__ = true;
        window.__APPFRAME_COMPANION_VERSION__ = "${EXTENSION_VERSION}";
        window.dispatchEvent(new CustomEvent('appframe:companion:ready', { detail: { version: "${EXTENSION_VERSION}" } }));
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch {}
  }

  markInstalled();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markInstalled);
  }

  // Escuta mensagens vindas do frontend do AppFrame via window.postMessage
  window.addEventListener('message', (event) => {
    // Aceita apenas mensagens da mesma janela
    if (event.source !== window || !event.data || typeof event.data !== 'object') {
      return;
    }

    const { type, requestId } = event.data;

    // Ping / Pong para verificação de presença
    if (type === 'APPFRAME_COMPANION_PING') {
      window.postMessage(
        {
          type: 'APPFRAME_COMPANION_PONG',
          requestId,
          installed: true,
          version: EXTENSION_VERSION,
        },
        '*',
      );
      return;
    }

    // Solicitação de sincronização de cookies
    if (type === 'APPFRAME_COMPANION_SYNC_REQUEST') {
      chrome.runtime.sendMessage({ action: 'GET_YOUTUBE_COOKIES' }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          window.postMessage(
            {
              type: 'APPFRAME_COMPANION_SYNC_RESPONSE',
              requestId,
              success: false,
              error: error.message || 'Falha na comunicação com a extensão AppFrame Companion.',
            },
            '*',
          );
          return;
        }

        window.postMessage(
          {
            type: 'APPFRAME_COMPANION_SYNC_RESPONSE',
            requestId,
            ...response,
          },
          '*',
        );
      });
      return;
    }

    // Checagem de status de login no YouTube
    if (type === 'APPFRAME_COMPANION_CHECK_LOGIN') {
      chrome.runtime.sendMessage({ action: 'CHECK_YOUTUBE_LOGIN' }, (response) => {
        window.postMessage(
          {
            type: 'APPFRAME_COMPANION_CHECK_LOGIN_RESPONSE',
            requestId,
            ...response,
          },
          '*',
        );
      });
      return;
    }
  });
})();
