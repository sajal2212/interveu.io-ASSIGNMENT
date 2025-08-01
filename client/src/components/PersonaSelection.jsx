import React from 'react';
import { Users, GraduationCap } from 'lucide-react';

const PersonaSelection = ({ onSelect }) => {
  return (
    <div className="persona-selection">
      <div className="persona-container">
        <h1>Live Polling System</h1>
        <p>Choose your role to get started</p>
        
        <div className="persona-cards">
          <div className="persona-card" onClick={() => onSelect('teacher')}>
            <GraduationCap size={48} />
            <h3>Teacher</h3>
            <p>Create polls and view results</p>
          </div>
          
          <div className="persona-card" onClick={() => onSelect('student')}>
            <Users size={48} />
            <h3>Student</h3>
            <p>Answer polls and see live results</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelection;
