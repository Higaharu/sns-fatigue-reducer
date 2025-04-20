import React, { useState, useEffect } from 'react';

type SiteSettings = {
  [key: string]: boolean;
};

type Settings = {
  enabled: boolean;
  fatigueThreshold: number;
  resetTime: number;
  blurIntensity: number;
  sites: SiteSettings;
  summaryApiUrl: string;
};

const OptionsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
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
  });

  useEffect(() => {
    // 保存された設定を読み込み
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setSettings(prev => {
      const newSettings = { ...prev };
      
      if (name.startsWith('site-')) {
        const site = name.replace('site-', '');
        newSettings.sites = {
          ...newSettings.sites,
          [site]: checked
        };
      } else {
        // @ts-ignore
        newSettings[name] = type === 'checkbox' ? checked : 
                          type === 'number' ? Number(value) : value;
      }
      
      return newSettings;
    });
  };

  const saveSettings = () => {
    chrome.storage.local.set({ settings }, () => {
      // Service Workerに設定変更を通知
      chrome.runtime.sendMessage({ 
        type: 'SETTINGS_UPDATED',
        settings 
      });
      
      // 保存完了メッセージを表示
      const status = document.getElementById('status');
      if (status) {
        status.textContent = '設定を保存しました';
        setTimeout(() => {
          status.textContent = '';
        }, 3000);
      }
    });
  };

  const resetStats = () => {
    if (confirm('すべての統計情報をリセットしますか？')) {
      chrome.storage.local.set({ stats: {} }, () => {
        alert('統計情報をリセットしました');
      });
    }
  };

  return (
    <div className="options-page">
      <h1>SNS疲労軽減拡張機能 - 設定</h1>
      
      <section>
        <h2>基本設定</h2>
        <div className="option-row">
          <label>
            <input
              type="checkbox"
              name="enabled"
              checked={settings.enabled}
              onChange={handleChange}
            />
            拡張機能を有効にする
          </label>
        </div>
        
        <div className="option-row">
          <label>
            疲労度しきい値 (コンテンツを隠し始める値):
            <input
              type="number"
              name="fatigueThreshold"
              value={settings.fatigueThreshold}
              min="0"
              max="100"
              onChange={handleChange}
            />
            %
          </label>
        </div>
        
        <div className="option-row">
          <label>
            統計リセット時間:
            <input
              type="number"
              name="resetTime"
              value={settings.resetTime}
              min="1"
              max="72"
              onChange={handleChange}
            />
            時間
          </label>
        </div>
        
        <div className="option-row">
          <label>
            ぼかし強度:
            <input
              type="number"
              name="blurIntensity"
              value={settings.blurIntensity}
              min="1"
              max="20"
              onChange={handleChange}
            />
            px
          </label>
        </div>
      </section>
      
      <section>
        <h2>監視対象サイト</h2>
        {Object.keys(settings.sites).map(site => (
          <div className="option-row" key={site}>
            <label>
              <input
                type="checkbox"
                name={`site-${site}`}
                checked={settings.sites[site]}
                onChange={handleChange}
              />
              {site}
            </label>
          </div>
        ))}
      </section>
      
      <section>
        <h2>API設定</h2>
        <div className="option-row">
          <label>
            要約API URL:
            <input
              type="text"
              name="summaryApiUrl"
              value={settings.summaryApiUrl}
              onChange={handleChange}
              className="full-width"
            />
          </label>
        </div>
      </section>
      
      <div className="buttons">
        <button onClick={saveSettings} className="primary">
          設定を保存
        </button>
        <button onClick={resetStats} className="danger">
          統計をリセット
        </button>
      </div>
      
      <div id="status" className="status"></div>
    </div>
  );
};

export default OptionsPage;