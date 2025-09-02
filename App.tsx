
import React, { useState } from 'react';
import { DataProvider } from './hooks/useData';
import { ThemeProvider } from './hooks/useTheme';
import { NotificationProvider } from './hooks/useNotifications';
import Dashboard from './components/pages/Dashboard';
import MonthlySummary from './components/pages/MonthlySummary';
import Receipts from './components/pages/Receipts';
import Settings from './components/pages/Settings';
import Reports from './components/pages/Reports';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import ToastContainer from './components/ui/ToastContainer';
import { Page } from './types';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard />;
            case 'summary':
                return <MonthlySummary />;
            case 'receipts':
                return <Receipts />;
            case 'settings':
                return <Settings />;
            case 'reports':
                return <Reports />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <ThemeProvider>
            <DataProvider>
                <NotificationProvider setCurrentPage={setCurrentPage}>
                    <div className="min-h-screen text-stone-800 dark:text-stone-200 font-sans">
                        <div className="fixed top-0 left-0 w-full h-full overflow-hidden">
                            <div className="animated-blob blob-1 bg-amber-300 dark:bg-amber-900"></div>
                            <div className="animated-blob blob-2 bg-orange-300 dark:bg-orange-900"></div>
                        </div>
                        <div className="container mx-auto p-2 pb-24 max-w-2xl relative">
                            <Header />
                            <main className="mt-4">
                                <div key={currentPage} className="page-transition-wrapper">
                                    {renderPage()}
                                </div>
                            </main>
                            <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
                        </div>
                    </div>
                    <ToastContainer />
                </NotificationProvider>
            </DataProvider>
        </ThemeProvider>
    );
};

export default App;