// SNSコンテンツの監視と操作を行うコンテンツスクリプト
let fatigueLevel = 0;
let startTime = Date.now();
let settings: {
  enabled: boolean;
  fatigueThreshold: number;
  blurIntensity: number;
  sites: { [key: string]: boolean };  // ←ここがポイント
} = {
  enabled: true,
  fatigueThreshold: 70,
  blurIntensity: 5,
  sites: {
    'twitter.com': true,
    'x.com': true,
    'facebook.com': true,
    'instagram.com': true
  }
};

let sidePanelOpen = false;
let sidePanelElement: HTMLElement | null = null;

// DOM要素のセレクタマッピング
const SELECTORS: { [key: string]: { [key: string]: string } } = {
  'twitter.com': {
    posts: 'article',
    trending: '[data-testid="trend"]',
    sidebar: '[data-testid="sidebarColumn"]'
  },
  'x.com': {
    posts: 'article',
    trending: '[data-testid="trend"]',
    sidebar: '[data-testid="sidebarColumn"]'
  },
  'facebook.com': {
    posts: '.x1lliihq',
    trending: '.x1jx94hy',
    sidebar: '.x1qjc9v5'
  },
  'instagram.com': {
    posts: 'article',
    feed: '._aak6',
    explore: '._aagw'
  }
};

// 初期化処理
function init() {
  // 現在のサイトが監視対象かチェック
  const currentDomain = window.location.hostname.replace('www.', '');
  
  // 設定を読み込み
  chrome.storage.local.get(['settings', 'stats'], (result) => {
    if (result.settings) {
      settings = result.settings;
    }
    
    // 現在のサイトの統計情報を取得
    const stats = result.stats || {};
    const siteStats = stats[currentDomain] || { 
      timeSpent: 0, 
      fatigueLevel: 0 
    };
    
    fatigueLevel = siteStats.fatigueLevel;
    
    // 疲労ゲージの表示
    createFatigueGauge();
    
    // 定期的な処理の開始
    startPeriodicProcessing();
  });
  
  // メッセージリスナーを設定
  setupMessageListeners();
}

// 疲労ゲージUI要素の作成
function createFatigueGauge() {
  const gaugeContainer = document.createElement('div');
  gaugeContainer.className = 'sns-fatigue-gauge';
  gaugeContainer.innerHTML = `
    <div class="gauge-fill" style="width: ${fatigueLevel}%"></div>
    <div class="gauge-text">${fatigueLevel}%</div>
  `;
  
  const style = document.createElement('style');
style.textContent = `
  .gauge-text {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    color: black;        /* ← ★ 文字の色！ */
    font-weight: bold;
    font-size: 13px;
    text-align: center;
    line-height: 20px;
    z-index: 10000;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

  // スタイル設定
  gaugeContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 100px;
    height: 20px;
    background: #eee;
    border-radius: 10px;
    overflow: hidden;
    z-index: 9999;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  document.body.appendChild(gaugeContainer);
  
  // 色の更新
  updateGaugeColor();
}

// ゲージの色を更新
function updateGaugeColor() {
  const gaugeFill = document.querySelector('.sns-fatigue-gauge .gauge-fill') as HTMLElement;
  if (!gaugeFill) return;
  
  let color = '#4caf50'; // 緑 (低疲労)
  if (fatigueLevel >= 30 && fatigueLevel < 70) {
    color = '#ff9800'; // オレンジ (中疲労)
  } else if (fatigueLevel >= 70) {
    color = '#f44336'; // 赤 (高疲労)
  }
  
  gaugeFill.style.backgroundColor = color;
  gaugeFill.style.width = `${fatigueLevel}%`;
  
  const gaugeText = document.querySelector('.sns-fatigue-gauge .gauge-text') as HTMLElement;
  if (gaugeText) {
    gaugeText.textContent = `${fatigueLevel}%`;
  }
}

// 定期的な処理（統計更新とUI操作）
function startPeriodicProcessing() {
  // 10秒ごとの更新処理
  setInterval(() => {
    if (!settings.enabled) return;
    
    // 現在のサイトが監視対象かチェック
    const currentDomain = window.location.hostname.replace('www.', '');
    if (!settings.sites[currentDomain]) return;
    
    // 滞在時間の更新（秒）
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // 疲労度の計算（滞在時間に応じて増加、最大100）
    // 閲覧1分ごとに約2%増加する計算
    fatigueLevel = Math.min(100, Math.floor(timeSpent / 30));
    
    // 統計情報の更新
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || {};
      stats[currentDomain] = {
        timeSpent,
        fatigueLevel
      };
      chrome.storage.local.set({ stats });
    });
    
    // ゲージUIの更新
    updateGaugeColor();
    
    // しきい値を超えた場合、コンテンツのぼかし処理
    if (fatigueLevel >= settings.fatigueThreshold) {
      blurContent();
    }
  }, 10000);
}

// コンテンツのぼかし処理
function blurContent() {
  const currentDomain = window.location.hostname.replace('www.', '');
  const domainSelectors = SELECTORS[currentDomain];
  if (!domainSelectors) return;
  
  // 疲労度に応じたぼかし強度（pxで指定）
  const blurIntensity = Math.max(1, Math.min(20, 
    settings.blurIntensity * (fatigueLevel - settings.fatigueThreshold) 
    / (100 - settings.fatigueThreshold)
  ));  
  
  // 各要素タイプに対してぼかし適用
  Object.values(domainSelectors).forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el: Element) => {
      (el as HTMLElement).style.filter = `blur(${blurIntensity}px)`;
    });
  });
}

// サイドパネルの作成と表示
function createSidePanel() {
  if (sidePanelElement) {
    sidePanelElement.style.display = 'block';
    return;
  }
  
  sidePanelElement = document.createElement('div');
  sidePanelElement.className = 'sns-fatigue-sidepanel';
  sidePanelElement.innerHTML = `
    <div class="panel-content">
      <div class="panel-header">
        <h2>読み込み中...</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-body">
        <div class="loading">コンテンツを取得中...</div>
      </div>
    </div>
  `;
  
  // スタイル設定
  sidePanelElement.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 350px;
    height: 100vh;
    background: white;
    box-shadow: -2px 0 10px rgba(0,0,0,0.2);
    z-index: 10000;
    transition: transform 0.3s ease;
  `;
  
  document.body.appendChild(sidePanelElement);
  
  // 閉じるボタンのイベント設定
  const closeBtn = sidePanelElement.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeSidePanel();
    });
  }
  
  // 現在のページコンテンツを収集して送信
  collectPageContent();
}

// サイドパネルを閉じる
function closeSidePanel() {
  if (sidePanelElement) {
    sidePanelElement.style.display = 'none';
  }
  sidePanelOpen = false;
}

// ページコンテンツの収集と送信
function collectPageContent() {
  const currentDomain = window.location.hostname.replace('www.', '');
  const domainSelectors = SELECTORS[currentDomain];
  if (!domainSelectors) return;
  
  let content = '';
  
  // 投稿内容を取得
  const postSelector = domainSelectors.posts;
  if (postSelector) {
    const posts = document.querySelectorAll(postSelector);
    posts.forEach((post: Element) => {
      content += post.textContent + '\n\n';
    });
  }
  
  // ServiceWorkerを介してサイドパネルにデータを送信
  chrome.runtime.sendMessage({
    type: 'CONTENT_DATA',
    content: content.trim(),
    url: window.location.href
  });
}

// メッセージリスナーの設定
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'OPEN_SIDEPANEL':
        sidePanelOpen = true;
        createSidePanel();
        break;
        
      case 'CLOSE_SIDEPANEL':
        closeSidePanel();
        break;
        
      case 'REQUEST_CONTENT':
        collectPageContent();
        break;
        
      case 'UPDATE_SETTINGS':
        settings = message.settings;
        break;
    }
    
    sendResponse({ success: true });
    return true;
  });
}

// 初期化の実行
init();