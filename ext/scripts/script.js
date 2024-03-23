const connectButton = document.getElementById('connect-button');

// Функция изменения текста кнопки и класса для кольца
function toggleButtonText() {
  if (connectButton.textContent === 'Pause') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: 'stop' });
    });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: 'start' });
    });
  }
}

function changeButton(state) {
  const classes = ['connected', 'connecting'];

  // Удаление всех классов из кнопки
  connectButton.classList.remove(...classes);

  // Установка текста и классов в зависимости от состояния
  switch (state) {
      case 'stop':
          connectButton.textContent = 'Connect';
          break;
      case 'reconnecting':
          connectButton.textContent = 'Pause';
          connectButton.classList.add('connecting');
          break;
      case 'connected':
          connectButton.textContent = 'Pause';
          connectButton.classList.add('connected');
          break;
      default:
          // Если передано неподдерживаемое состояние, ничего не делаем
          break;
  }
}


// Пример: вызов функции при клике на кнопку
connectButton.addEventListener('click', function() {
  toggleButtonText();
});

// Пример: переход на страницу настроек при клике на иконку настроек
const settingsIcon = document.querySelector('.settings-icon');
settingsIcon.addEventListener('click', function() {
  // Здесь можно добавить код для перехода на страницу настроек
  console.log('Переход на страницу настроек...');
});


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'status') {
    changeButton(message.textContent)
  }
});

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tabId = tabs[0].id;
    chrome.tabs.sendMessage(tabId, { action: 'status' }, function(response) {
      changeButton(response.textContent)
    });
  });
});
