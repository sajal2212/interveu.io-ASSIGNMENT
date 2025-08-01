import React from 'react';
import { BarChart3 } from 'lucide-react';

const PollResults = ({ results = [], totalVotes, compact = false }) => {
  const maxVotes = Math.max(...results.map(r => r.votes), 1);

  return (
    <div className={`poll-results ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="results-header">
          <BarChart3 size={24} />
          <h3>Results ({totalVotes} votes)</h3>
        </div>
      )}
      
      <div className="results-list">
        {results.map((option, index) => {
          const percentage = totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(1) : 0;
          const barWidth = totalVotes > 0 ? (option.votes / maxVotes) * 100 : 0;
          
          return (
            <div key={index} className="result-item">
              <div className="result-header">
                <span className="option-label">
                  {String.fromCharCode(65 + index)}. {option.text}
                </span>
                <span className="result-stats">
                  {option.votes} votes ({percentage}%)
                </span>
              </div>
              <div className="result-bar-container">
                <div 
                  className="result-bar"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PollResults;
