import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onLogin();
    navigate('/home');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-900 p-6">
      <div className="w-24 h-24 bg-brand-600 rounded-full flex items-center justify-center mb-8 animate-pulse">
        <span className="text-3xl font-bold">K</span>
      </div>
      <h1 className="text-2xl font-bold mb-2 text-white">Welcome to Kizuna</h1>
      <p className="text-gray-400 mb-8 text-center">Create immersive AI characters and stories.</p>
      
      <button 
        onClick={handleLogin}
        className="w-full max-w-xs bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-6 rounded-full transition-all transform hover:scale-105"
      >
        Login / Sign Up
      </button>
    </div>
  );
};