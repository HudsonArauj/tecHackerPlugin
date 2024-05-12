document.addEventListener('DOMContentLoaded', function () {
  browser.tabs.query({ active: true, currentWindow: true }).then(updatePopup);
});

function updatePopup(tabs) {
  const currentTab = tabs[0];
  browser.runtime.sendMessage({ request: "getData", tabId: currentTab.id }).then((response) => {
      updateElementText('third-party-requests', `Teceira Parte Requests: ${response.thirdPartyRequests}`);
      updateElementText('first-party-cookies', `Primeira Parte Cookies: ${response.firstPartyCookies}`);
      updateElementText('third-party-cookies', `Teceira Parte Cookies: ${response.thirdPartyCookies}`);
      updateElementText('local-storage-items', `Local Storage: ${response.localStorageItems}`);
      updateElementText('session-storage-items', `Sessão Storage: ${response.sessionStorageItems}`);
      updateElementText('privacy-score', `Privacidade: ${response.score}`);
      updateRiskElement('hijacking-risk', response.hijackingRisk, 'Hijacking Risk');
      updateRiskElement('canvas-fingerprint', response.canvasFingerprintDetected, 'Canvas Fingerprint');
  });
}

function updateElementText(id, text) {
  const element = document.getElementById(id);
  if (element) {
      element.textContent = text;
  }
}

function updateRiskElement(id, riskDetected, labelText) {
  const element = document.getElementById(id);
  if (element) {
      element.textContent = `${labelText}: ${riskDetected ? 'Sim' : 'Não'}`;
      if (riskDetected) {
          element.classList.remove('not-detected');
          element.classList.add('detected');
      } else {
          element.classList.remove('detected');
          element.classList.add('not-detected');
      }
  }
}
