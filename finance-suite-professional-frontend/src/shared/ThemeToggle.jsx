import React from 'react';
import { useTheme } from './ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const hoverClass = theme === 'dark'
    ? 'hover:bg-slate-800 hover:text-slate-200'
    : 'hover:bg-gray-100 hover:text-gray-900';

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className={`
        flex items-center justify-center
        h-8 w-8
        rounded-md
        text-gray-500
        dark:text-slate-400
        transition-all duration-200
        ${hoverClass}
      `}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" strokeWidth={1.8} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.8} />
      )}
    </button>
  );
}
