
import React, { useState } from 'react';
import { DataProvider, useData } from './hooks/useData';
import { ThemeProvider } from './hooks/useTheme';
import { NotificationProvider } from './hooks/useNotifications';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Dashboard from './components/pages/Dashboard';
import MonthlySummary from './components/pages/MonthlySummary';
import Receipts from './components/pages/Receipts';
import Settings from './components/pages/Settings';
import Reports from './components/pages/Reports';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import ToastContainer from './components/ui/ToastContainer';
import LoginPage from './components/pages/LoginPage';
import SetupPage from './components/pages/SetupPage';
import WelcomePage from './components/pages/WelcomePage';

export type Page = 'dashboard' | 'summary' | 'receipts' | 'settings' | 'reports';

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <DataProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </DataProvider>
        </ThemeProvider>
    );
};

const AppContent: React.FC = () => {
    const { data } = useData();
    const { isAuthenticated } = useAuth();
    
    const needsSetup = !data.auth?.password;

    if (needsSetup) {
        return <SetupPage />;
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }
    
    // If authenticated, but the welcome screen hasn't been shown, show it.
    if (data.welcomeScreenShown === false) {
        return <WelcomePage />;
    }
    
    return <AuthenticatedApp />;
};

const AuthenticatedApp: React.FC = () => {
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
        <NotificationProvider setCurrentPage={setCurrentPage}>
            <div className="min-h-screen text-stone-800 dark:text-stone-200 font-sans">
                {/* Background Blobs Layer */}
                <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0">
                    <div className="animated-blob blob-1 bg-amber-300 dark:bg-amber-900"></div>
                    <div className="animated-blob blob-2 bg-orange-300 dark:bg-orange-900"></div>
                </div>

                {/* Background Illustration Layer */}
                <div
                    aria-hidden="true"
                    className="fixed inset-0 z-0 opacity-5 dark:opacity-[0.02] bg-repeat"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230c0a09' fill-opacity='1'%3E%3Cpath d='M80 80V0h-29.333L0 29.333V80h80zM29.333 0H0v29.333L80 0h-50.667z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                ></div>

                {/* Content Layer */}
                <div className="container mx-auto p-2 pb-24 max-w-2xl relative z-10">
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
    );
};

export default App;
