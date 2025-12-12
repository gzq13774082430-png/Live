import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, List, PlayCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        <Link to="/home" className={`flex flex-col items-center p-2 ${isActive('/home') ? 'text-brand-500' : 'text-gray-400'}`}>
          <PlayCircle size={24} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link to="/create" className={`flex flex-col items-center p-2 ${isActive('/create') ? 'text-brand-500' : 'text-gray-400'}`}>
          <PlusCircle size={24} />
          <span className="text-xs mt-1">Create</span>
        </Link>
        <Link to="/manage" className={`flex flex-col items-center p-2 ${isActive('/manage') ? 'text-brand-500' : 'text-gray-400'}`}>
          <List size={24} />
          <span className="text-xs mt-1">Manage</span>
        </Link>
      </div>
    </nav>
  );
};