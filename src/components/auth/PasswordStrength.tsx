import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: number;
  suggestions: string[];
}

const evaluatePasswordStrength = (password: string): StrengthResult => {
  const suggestions: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    suggestions.push('Add more characters to make it at least 8 characters long');
  } else {
    score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    suggestions.push('Add uppercase letters');
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    suggestions.push('Add lowercase letters');
  } else {
    score += 1;
  }

  // Numbers check
  if (!/\d/.test(password)) {
    suggestions.push('Add numbers');
  } else {
    score += 1;
  }

  // Special characters check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    suggestions.push('Add special characters (!@#$%^&*(),.?":{}|<>)');
  } else {
    score += 1;
  }

  return {
    score,
    suggestions
  };
};

const getStrengthLabel = (score: number): { label: string; color: string } => {
  if (score <= 2) return { label: 'Weak', color: 'text-red-500' };
  if (score <= 4) return { label: 'Medium', color: 'text-yellow-500' };
  return { label: 'Strong', color: 'text-green-500' };
};

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  if (!password) return null;

  const { score, suggestions } = evaluatePasswordStrength(password);
  const { label, color } = getStrengthLabel(score);

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              score <= 2 ? 'bg-red-500' : score <= 4 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${color}`}>{label}</span>
      </div>
      
      {suggestions.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">Suggestions:</p>
          <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
            {suggestions.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PasswordStrength; 