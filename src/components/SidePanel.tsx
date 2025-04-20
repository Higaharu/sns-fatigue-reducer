import React, { useState, useEffect } from 'react';

const SidePanel: React.FC = () => {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    // コンテンツスクリプトからのメッセージを受信
    const messageListener = (message: any) => {
      if (message.type === 'CONTENT_DATA') {
        fetchSummary(message.content, message.url);
        setCurrentUrl(message.url);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    
    // パネルが開いたときにコンテンツを要求
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id as number, { 
        type: 'REQUEST_CONTENT' 
      });
    });

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const fetchSummary = async (content: string, url: string) => {
    setIsLoading(true);
    
    try {
      // Service Workerに要約リクエストを送信
      chrome.runtime.sendMessage(
        { 
          type: 'GET_SUMMARY', 
          content,
          url 
        },
        (response) => {
          if (response && response.summary) {
            setSummary(response.summary);
          } else {
            setSummary('コンテンツの要約に失敗しました。');
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Summary error:', error);
      setSummary('要約の取得中にエラーが発生しました。');
      setIsLoading(false);
    }
  };

  const closeSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id as number, { 
        type: 'CLOSE_SIDEPANEL' 
      });
    });
  };

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h2>コンテンツ要約</h2>
        <button onClick={closeSidePanel} className="close-btn">×</button>
      </div>
      
      {currentUrl && (
        <div className="source-url">
          出典: {new URL(currentUrl).hostname}
        </div>
      )}
      
      <div className="summary-content">
        {isLoading ? (
          <div className="loading">要約を生成中...</div>
        ) : (
          <div className="summary-text">
            {summary.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SidePanel;