import React from 'react';

export default function DifficultyDots({ level = 1, size = 'md' }) {
  const dotSize = size === 'sm' ? 5 : 7;
  return (
    <div className="difficulty-dots" title={`Difficulty: ${level}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`difficulty-dot ${i <= level ? 'active' : ''} ${i <= level && level >= 3 ? `d${level}` : ''}`}
          style={{ width: dotSize, height: dotSize }}
        />
      ))}
    </div>
  );
}
