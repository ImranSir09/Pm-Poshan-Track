import React from 'react';
// FIX: The 'Page' type is exported from 'types.ts', not '../App'. Correcting the import path.
import { Page } from '../../types';

interface NavButtonProps {
  // FIX: Changed JSX.Element to React.ReactElement to resolve potential "Cannot find namespace 'JSX'" error.
  icon: React.ReactElement;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs font-medium transition-all duration-300 ${
                isActive ? 'text-amber-600 scale-110' : 'text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
            }`}
        >
            {icon}
            <span className="mt-1">{label}</span>
        </button>
    );
};

interface NavigationProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, setCurrentPage }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
        { id: 'summary', label: 'Summary', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 000-2H3zm3 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-1 4a1 1 0 100 2h6a1 1 0 100-2H5z" clipRule="evenodd" /></svg> },
        { id: 'receipts', label: 'Receipts', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg> },
        { id: 'reports', label: 'Reports', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" /></svg> },
        { id: 'settings', label: 'Settings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-amber-200/50 dark:border-white/20">
            <div className="max-w-2xl mx-auto flex items-center justify-around">
                {navItems.map(item => (
                    <NavButton
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={currentPage === item.id}
                        onClick={() => setCurrentPage(item.id as Page)}
                    />
                ))}
            </div>
        </nav>
    );
};

export default Navigation;