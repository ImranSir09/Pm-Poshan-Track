
import React from 'react';
import { useData } from '../../hooks/useData';
import Card from '../ui/Card';
import Button from '../ui/Button';

const WelcomePage: React.FC = () => {
    const { markWelcomeAsShown } = useData();

    const handleContinue = () => {
        sessionStorage.setItem('initialPage', 'settings');
        markWelcomeAsShown();
    };

    return (
        <div className="min-h-screen text-stone-800 dark:text-stone-200 font-sans flex items-center justify-center p-4">
            {/* Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="animated-blob blob-1 bg-amber-300 dark:bg-amber-900"></div>
                <div className="animated-blob blob-2 bg-orange-300 dark:bg-orange-900"></div>
            </div>

            {/* Content */}
            <div className="container mx-auto max-w-md relative z-10">
                <Card className="w-full text-center">
                    <div className="p-4">
                        <h1 className="text-2xl font-bold text-amber-700 dark:text-amber-400">Welcome to PM POSHAN Tracker!</h1>
                        <p className="mt-4 text-stone-600 dark:text-gray-300">
                            Thank you for choosing this app to manage your Mid-Day Meal records. I've designed it to be simple, reliable, and completely offline-first.
                        </p>
                        <p className="mt-2 text-stone-600 dark:text-gray-300">
                            To get started, please take a moment to fill in your school's details in the settings. This is crucial for accurate reports.
                        </p>
                        
                        <div className="mt-6 text-xs pt-4 border-t border-amber-200/50 dark:border-white/10 text-stone-500 dark:text-gray-400">
                            <p>If you have any questions or feedback, feel free to reach out.</p>
                            <p className="mt-2"><strong>- Imran Gani Mugloo</strong> (Developer)</p>
                            <p><a href="tel:+919149690096" className="text-amber-600 dark:text-amber-400 hover:underline">+91 9149690096</a></p>
                            <p><a href="mailto:emraanmugloo123@gmail.com" className="text-amber-600 dark:text-amber-400 hover:underline">emraanmugloo123@gmail.com</a></p>
                        </div>

                        <div className="mt-8">
                            <Button onClick={handleContinue} className="w-full">
                                Let's Go to Settings
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default WelcomePage;
