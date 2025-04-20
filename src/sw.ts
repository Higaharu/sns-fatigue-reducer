// Service Worker: メッセージングとバックグラウンド処理を管理

// デフォルト設定
const DEFAULT_SETTINGS = {
  enabled: true,
  fatigueThreshold: 70,
  resetTime: 24,
  sites: {
    'twitter.com': true,
    'x.com': true,
    'facebook.com': true,
    'instagram.com': true
  },
  blurIntensity: 5,
  summaryApiUrl: 'https://api.example.com/summarize'
};

// 拡張機能のインストール時の処理
chrome.runtime.onInstalled.addListener(() => {
  // デフォルト設定の保存
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  });
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SUMMARY':
      // 要約APIを呼び出し
      fetchSummary(message.content, message.url)
        .then(summary => {
          sendResponse({ summary });
        })
        .catch(error => {
          console.error('Summary API error:', error);
          sendResponse({ error: 'API error' });
        });
      return true; // 非同期レスポンスを使用
      
    case 'CONTENT_DATA':
      // コンテンツデータをサイドパネルに転送
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'CONTENT_DATA',
            content: message.content,
            url: message.url
          });
        }
      });
      sendResponse({ success: true });
      break;
      
    case 'SETTINGS_UPDATED':
      // 設定更新をコンテンツスクリプトに通知
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'UPDATE_SETTINGS',
            settings: message.settings
          });
        }
      });
      sendResponse({ success: true });
      break;
      
    case 'TOGGLE_EXTENSION':
      // 拡張機能の有効/無効状態を更新
      chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || DEFAULT_SETTINGS;
        settings.enabled = message.enabled;
        chrome.storage.local.set({ settings });
        
        // すべてのタブに通知
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_SETTINGS',
                settings
              }).catch(() => {
                // タブが拡張機能と互換性がない場合のエラーを無視
              });
            }
          });
        });
      });
      sendResponse({ success: true });
      break;
  }
  
  return false;
});

// 要約APIを呼び出す関数
async function fetchSummary(content: string, url: string): Promise<string> {
  // 設定からAPI URLを取得
  const { settings } = await chrome.storage.local.get(['settings']);
  const apiUrl = settings?.summaryApiUrl || DEFAULT_SETTINGS.summaryApiUrl;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        url,
        max_length: 300
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.summary || '要約を取得できませんでした。';
  } catch (error) {
    console.error('Summary API error:', error);
    return '要約の取得中にエラーが発生しました。';
  }
}

// 統計情報の定期的なリセット処理
async function setupStatsReset() {
  // 設定からリセット時間を取得
  const { settings } = await chrome.storage.local.get(['settings']);
  const resetHours = settings?.resetTime || DEFAULT_SETTINGS.resetTime;
  
  // 24時間（デフォルト）ごとに統計情報をリセット
  setInterval(async () => {
    // 最後のリセット時刻を確認
    const { lastReset } = await chrome.storage.local.get(['lastReset']);
    const now = Date.now();
    
    // リセット時間が経過していたらリセット
    if (!lastReset || (now - lastReset) > resetHours * 60 * 60 * 1000) {
      await chrome.storage.local.set({ 
        stats: {},
        lastReset: now
      });
      console.log('Stats reset completed');
    }
  }, 60 * 60 * 1000); // 1時間ごとにチェック
}

// 拡張機能の初期化
setupStatsReset();