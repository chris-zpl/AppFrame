/**
 * AppFrame Companion - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const ytIndicator = document.getElementById('yt-indicator');
  const ytStatusText = document.getElementById('yt-status-text');
  const serverInput = document.getElementById('server-url');
  const syncBtn = document.getElementById('sync-btn');
  const syncBtnText = document.getElementById('sync-btn-text');
  const feedback = document.getElementById('feedback');

  // Carrega URL do servidor salva
  chrome.storage.local.get(['appframe_server_url'], (res) => {
    if (res.appframe_server_url) {
      serverInput.value = res.appframe_server_url;
    }
  });

  serverInput.addEventListener('change', () => {
    chrome.storage.local.set({ appframe_server_url: serverInput.value.trim() });
  });

  // Checa status de login do YouTube
  function checkYouTubeStatus() {
    chrome.runtime.sendMessage({ action: 'CHECK_YOUTUBE_LOGIN' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        ytIndicator.className = 'dot dot-disconnected';
        ytStatusText.textContent = 'Erro ao verificar sessão do YouTube.';
        return;
      }

      if (response.loggedIn) {
        ytIndicator.className = 'dot dot-connected';
        ytStatusText.textContent = `Sessão ativa detectada (${response.count} cookies).`;
      } else {
        ytIndicator.className = 'dot dot-disconnected';
        ytStatusText.textContent = 'Não conectado. Faça login no YouTube neste navegador.';
      }
    });
  }

  checkYouTubeStatus();

  function showFeedback(type, message) {
    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
  }

  // Sincronização 1-clique
  syncBtn.addEventListener('click', async () => {
    const serverUrl = serverInput.value.trim() || 'http://localhost:3000';
    chrome.storage.local.set({ appframe_server_url: serverUrl });

    syncBtn.disabled = true;
    syncBtnText.textContent = 'Sincronizando...';
    showFeedback('loading', 'Lendo sessão e sincronizando com o AppFrame...');

    // 1. Tenta sincronizar primeiro pela aba ativa do AppFrame caso esteja aberta
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      const isAppFrameTab =
        activeTab &&
        activeTab.url &&
        (activeTab.url.includes('localhost') || activeTab.url.includes('appframe.com'));

      chrome.runtime.sendMessage(
        { action: 'SYNC_TO_SERVER', serverUrl },
        (res) => {
          syncBtn.disabled = false;
          syncBtnText.textContent = 'Sincronizar com AppFrame';

          if (chrome.runtime.lastError) {
            showFeedback('error', chrome.runtime.lastError.message || 'Falha na extensão.');
            return;
          }

          if (res && res.success) {
            showFeedback('success', `✅ Sincronizado com sucesso! (${res.count || ''} cookies).`);
            checkYouTubeStatus();

            // Se o usuário estiver com a aba do AppFrame aberta, recarrega a página ou avisa
            if (isAppFrameTab) {
              chrome.tabs.sendMessage(activeTab.id, { type: 'APPFRAME_SYNCED' }).catch(() => {});
            }
          } else {
            showFeedback('error', res?.error || 'Erro ao sincronizar com o servidor.');
          }
        },
      );
    });
  });
});
