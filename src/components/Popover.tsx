import React, { useState, useEffect } from 'react';
import { FatigueGauge } from './FatigueGauge';

const Popover: React.FC = () => {
  const [siteStats, setSiteStats] = useState({
    currentSite: '',
    timeSpent: 0,
    fatigueLevel: 0,
  });
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // 現在のタブ情報を取得
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || '';
      
      // ストレージから現在のサイトの統計情報を取得
      chrome.storage.local.get(['stats', 'settings'], (result) => {
        const allStats = result.stats || {};
        const currentSiteStats = allStats[getDomain(currentUrl)] || { 
          timeSpent: 0, 
          fatigueLevel: 0 
        };
        
        setSiteStats({
          currentSite: getDomain(currentUrl),
          timeSpent: currentSiteStats.timeSpent,
          fatigueLevel: currentSiteStats.fatigueLevel
        });
        
        setIsEnabled(result.settings?.enabled !== false);
      });
    });
  }, []);

  const toggleEnabled = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      settings.enabled = newState;
      chrome.storage.local.set({ settings });
      
      // Service Workerに状態変更を通知
      chrome.runtime.sendMessage({ 
        type: 'TOGGLE_EXTENSION', 
        enabled: newState 
      });
    });
  };

  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id as number, { 
        type: 'OPEN_SIDEPANEL' 
      });
    });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  // URLからドメイン名を抽出するヘルパー関数
  const getDomain = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch (e) {
      return '';
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`;
    }
    return `${minutes}分`;
  };

  return (
    <div className="popover">
      <h2>SNS疲労度</h2>
      
      {siteStats.currentSite ? (
        <>
          <p>現在のサイト: {siteStats.currentSite}</p>
          <p>閲覧時間: {formatTime(siteStats.timeSpent)}</p>
          
          <FatigueGauge value={siteStats.fatigueLevel} />
          
          <div className="actions">
            <button 
              className={`toggle ${isEnabled ? 'enabled' : 'disabled'}`}
              onClick={toggleEnabled}
            >
              {isEnabled ? '有効' : '無効'}
            </button>
            
            <button onClick={openSidePanel}>
              サイドパネルを開く
            </button>
            
            <button onClick={openOptions} className="options-btn">
              設定
            </button>
          </div>
        </>
      ) : (
        <p>SNSサイトを開いていません</p>
      )}
    </div>
  );
};

export default Popover;