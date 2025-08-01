import React from 'react';
import { GraduationCap, Users } from 'lucide-react';

const PersonaSelection = ({ onSelectPersona }) => {
  const handlePersonaClick = (persona) => {
    console.log('Persona selected:', persona);
    if (typeof onSelectPersona === 'function') {
      onSelectPersona(persona);
    } else {
      console.error('onSelectPersona is not a function:', onSelectPersona);
    }
  };

  return (
    <div className="persona-selection">
      <div className="persona-container">
        <h1>Live Polling System</h1>
        <p>Select your role to get started</p>
        
        <div className="persona-cards">
          <div 
            className="persona-card" 
            onClick={() => handlePersonaClick('teacher')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handlePersonaClick('teacher');
              }
            }}
          >
            <Users size={48} />
            <h3>Teacher</h3>
            <p>Create and manage live polls, send questions to students, and view real-time results</p>
          </div>

          <div 
            className="persona-card" 
            onClick={() => handlePersonaClick('student')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handlePersonaClick('student');
              }
            }}
          >
            <GraduationCap size={48} />
            <h3>Student</h3>
            <p>Join live polling sessions, answer questions, and see results in real-time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelection;
