import React from 'react';

interface FatigueGaugeProps {
  value: number;  // 0-100の値
}

export const FatigueGauge: React.FC<FatigueGaugeProps> = ({ value }) => {
  // 値の範囲を0-100に制限
  const normalizedValue = Math.max(0, Math.min(100, value));
  
  // 値に基づいて色を決定
  const getColor = (value: number): string => {
    if (value < 30) return '#4caf50';      // 緑 (低疲労)
    if (value < 70) return '#ff9800';      // オレンジ (中疲労)
    return '#f44336';                      // 赤 (高疲労)
  };

  const color = getColor(normalizedValue);
  
  return (
    <div className="fatigue-gauge-container">
      <div className="fatigue-label">
        疲労度: {normalizedValue}%
      </div>
      <div className="fatigue-gauge-background">
        <div 
          className="fatigue-gauge-fill"
          style={{
            width: `${normalizedValue}%`,
            backgroundColor: color,
            transition: 'width 0.5s ease, background-color 0.5s ease'
          }}
        />
      </div>
      <div className="fatigue-status">
        {normalizedValue < 30 && '良好'}
        {normalizedValue >= 30 && normalizedValue < 70 && '注意'}
        {normalizedValue >= 70 && '休憩推奨'}
      </div>
    </div>
  );
};