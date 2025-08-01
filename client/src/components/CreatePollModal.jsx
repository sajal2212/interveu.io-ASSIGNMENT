import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';

const CreatePollModal = ({ onSubmit, onClose }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [timeLimit, setTimeLimit] = useState(60);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validOptions = options.filter(opt => opt.trim());
    
    if (question.trim() && validOptions.length >= 2) {
      onSubmit({
        question: question.trim(),
        options: validOptions,
        timeLimit
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal create-poll-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Poll</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="poll-form">
          <div className="form-group">
            <label>Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your poll question..."
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label>Options</label>
            {options.map((option, index) => (
              <div key={index} className="option-input">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="btn-icon remove-option"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <Minus size={16} />
                  </button>
                )}
              </div>
            ))}
            
            {options.length < 6 && (
              <button
                type="button"
                className="btn btn-secondary add-option"
                onClick={handleAddOption}
              >
                <Plus size={16} />
                Add Option
              </button>
            )}
          </div>

          <div className="form-group">
            <label>Time Limit (seconds)</label>
            <select
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePollModal;
