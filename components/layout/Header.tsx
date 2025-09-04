
import React, { useState, useEffect } from 'react';
import { useData } from '../../hooks/useData';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationPanel from '../ui/NotificationPanel';
import { useAuth } from '../../hooks/useAuth';

const SystemIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V8a1 1 0 10-2 0v4z" /><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2-2H5a2 2 0 01-2-2V5zm2-1a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5z" clipRule="evenodd" /></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zm.464-10.607a1 1 0 00-1.414 1.414l.707.707a1 1 0 101.414-1.414l-.707-.707zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>;

const Header: React.FC = () => {
    const { data } = useData();
    const { theme, setTheme } = useTheme();
    const { logout } = useAuth();
    const { notifications, dismissNotification, dismissAllNotifications, handleNotificationAction } = useNotifications();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const toggleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    const ThemeIcon = () => {
        if (theme === 'light') return <SunIcon />;
        if (theme === 'dark') return <MoonIcon />;
        return <SystemIcon />;
    };
    
    const themeLabel = `Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`;

    return (
        <>
            {isPanelOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" 
                    onClick={() => setIsPanelOpen(false)}
                    aria-hidden="true"
                />
            )}
            <header className="relative z-40 flex items-center justify-between p-3 bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl rounded-xl border border-amber-200/50 dark:border-white/20 shadow-md">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-500 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-stone-900 dark:text-white">{data.settings.schoolDetails.name}</h1>
                        <p className="text-xs text-stone-500 dark:text-gray-300">PM POSHAN Tracker</p>
                    </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="relative">
                        <button
                            onClick={() => setIsPanelOpen(prev => !prev)}
                            className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Toggle notifications"
                        >
                            <BellIcon />
                            {notifications.length > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">
                                        {notifications.length}
                                    </span>
                                </span>
                            )}
                        </button>
                        {isPanelOpen && (
                            <NotificationPanel
                                notifications={notifications}
                                onDismiss={dismissNotification}
                                onDismissAll={dismissAllNotifications}
                                onAction={handleNotificationAction}
                                onClose={() => setIsPanelOpen(false)}
                            />
                        )}
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label={themeLabel}
                        title={themeLabel}
                    >
                        <ThemeIcon />
                    </button>
                    <button
                        onClick={logout}
                        className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Logout"
                        title="Logout"
                    >
                        <LogoutIcon />
                    </button>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-medium text-stone-700 dark:text-gray-200">{currentTime.toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                        <p className="text-xs text-stone-500 dark:text-gray-400">{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
