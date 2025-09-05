
import React from 'react';
import { useData } from '../../hooks/useData';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Accordion, AccordionItem } from '../ui/Accordion';

const WelcomeIllustration = () => (
    <svg width="100%" height="150" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="subtleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        {/* Sun */}
        <circle cx="250" cy="50" r="40" fill="url(#welcomeGrad)" filter="url(#subtleGlow)" />
        
        {/* Plate of food */}
        <g transform="translate(150, 80)">
            <ellipse cx="0" cy="30" rx="50" ry="15" fill="#fef3c7" />
            <ellipse cx="0" cy="28" rx="48" ry="13" fill="#fff" />
            <circle cx="-20" cy="25" r="8" fill="#d97706" /> 
            <circle cx="10" cy="20" r="10" fill="#facc15" /> 
            <rect x="5" y="30" width="20" height="10" rx="5" fill="#4ade80" />
        </g>
        
        {/* Book */}
        <g transform="translate(50, 70)" fill="#fefce8">
            <path d="M 0 60 L 0 10 A 10 10 0 0 1 10 0 L 70 0 A 10 10 0 0 1 80 10 L 80 60 L 40 50 Z" />
            <path d="M 40 5 L 40 50" stroke="#fcd34d" strokeWidth="2" />
            <text x="20" y="35" fontFamily="Poppins, sans-serif" fontSize="12" fill="#ca8a04" transform="rotate(-10 20 35)">✓</text>
        </g>

        <text x="150" y="40" fontFamily="Poppins, sans-serif" fontSize="20" fontWeight="bold" fill="#fff" textAnchor="middle">Setup Complete!</text>
    </svg>
);


const WelcomePage: React.FC = () => {
    const { data, markWelcomeAsShown } = useData();
    const { settings } = data;
    const { schoolDetails, mdmIncharge } = settings;

    return (
        <div className="min-h-screen text-stone-800 dark:text-stone-200 font-sans">
            {/* Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="animated-blob blob-1 bg-amber-300 dark:bg-amber-900"></div>
                <div className="animated-blob blob-2 bg-orange-300 dark:bg-orange-900"></div>
            </div>

            {/* Content */}
            <div className="container mx-auto p-4 max-w-2xl relative z-10 flex flex-col items-center justify-center min-h-screen">
                <Card className="w-full">
                    <WelcomeIllustration />
                    <div className="text-center mt-4">
                        <h1 className="text-2xl font-bold text-amber-700 dark:text-amber-400">Welcome, {mdmIncharge.name || 'User'}!</h1>
                        <p className="mt-2 text-stone-600 dark:text-gray-300">
                            Your PM POSHAN Tracker has been successfully set up for <span className="font-semibold">{schoolDetails.name}</span>.
                        </p>
                        <p className="mt-1 text-xs text-stone-500 dark:text-gray-400">
                            Here are a few important things to know before you begin.
                        </p>
                    </div>

                    <div className="mt-6 space-y-3">
                        <Accordion>
                            <AccordionItem id="details" title="Your Setup Details">
                                <ul className="text-sm space-y-2 text-stone-600 dark:text-gray-300">
                                    <li><strong>School:</strong> {schoolDetails.name}</li>
                                    <li><strong>UDISE:</strong> {schoolDetails.udise || 'Not Provided'}</li>
                                    <li><strong>Location:</strong> {`${schoolDetails.village}, ${schoolDetails.block}, ${schoolDetails.district}, ${schoolDetails.state}`}</li>
                                    <li><strong>Incharge:</strong> {mdmIncharge.name}</li>
                                    <li><strong>Contact:</strong> {mdmIncharge.contact || 'Not Provided'}</li>
                                </ul>
                                <p className="text-xs mt-3 text-stone-500 dark:text-gray-400">You can change these anytime in the 'Settings' tab.</p>
                            </AccordionItem>
                            <AccordionItem id="rules" title="Important Reminders">
                                 <ul className="list-disc list-inside space-y-2 text-sm text-stone-600 dark:text-gray-300">
                                    <li><strong>Accuracy is Key:</strong> Ensure all data, especially student enrollment and daily attendance, is accurate for correct calculations and official reports.</li>
                                    <li><strong>Regular Backups:</strong> Use the 'Export Data' feature in the 'Reports' tab regularly. This is your only way to prevent data loss.</li>
                                    <li><strong>Update Settings:</strong> If food rates or school details change, update them immediately in the 'Settings' tab to ensure all future calculations are correct.</li>
                                </ul>
                            </AccordionItem>
                             <AccordionItem id="disclaimer" title="Data & Privacy Disclaimer">
                                 <div className="space-y-2 text-sm text-stone-600 dark:text-gray-300">
                                     <p>
                                        <strong>All your data is stored locally on this device.</strong> This application does not send your information to any online server, and the developer has no access to it.
                                     </p>
                                     <p>
                                        This also means you are solely responsible for your data. The developer cannot be held liable for any data loss. Please create regular backups.
                                     </p>
                                 </div>
                            </AccordionItem>
                             <AccordionItem id="developer" title="About the Developer">
                                <div className="text-sm space-y-1 text-stone-600 dark:text-gray-300">
                                    <p><strong>Developer:</strong> Imran Gani Mugloo</p>
                                    <p><strong>Contact:</strong> <a href="tel:+919149690096" className="text-amber-600 dark:text-amber-400 hover:underline">+91 9149690096</a></p>
                                    <p><strong>Email:</strong> <a href="mailto:emraanmugloo123@gmail.com" className="text-amber-600 dark:text-amber-400 hover:underline">emraanmugloo123@gmail.com</a></p>
                                    <p>Your feedback is valuable for improving this app. Please don't hesitate to reach out with questions or suggestions!</p>
                                </div>
                            </AccordionItem>
                        </Accordion>
                    </div>

                    <div className="mt-8">
                        <Button onClick={markWelcomeAsShown} className="w-full">
                            Let's Get Started
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default WelcomePage;
