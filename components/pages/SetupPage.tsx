import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { SIGNUP_KEY } from '../../constants';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import TermsModal from '../ui/TermsModal';

const SECURITY_QUESTIONS = [
    "What was your first school's name?",
    "What is your mother's maiden name?",
    "What is the name of your first pet?",
    "In what city were you born?",
];

const SetupPage: React.FC = () => {
    const { setupAccount } = useAuth();
    const { showToast } = useToast();
    const [signupKey, setSignupKey] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!agreedToTerms) {
            showToast('You must agree to the Terms and Conditions to proceed.', 'error');
            return;
        }

        if (signupKey.trim() !== SIGNUP_KEY) {
            showToast('Invalid Signup Key. Please contact an administrator.', 'error');
            return;
        }

        if (!username || !password || !securityAnswer) {
            showToast('Please fill out all fields.', 'error');
            return;
        }
        if (password.length < 6) {
            showToast('Password must be at least 6 characters long.', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        setupAccount({
            username,
            password,
            securityQuestion,
            securityAnswer,
        });
        showToast('Setup complete! Welcome.', 'success');
    };

    return (
        <>
            <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
            <div className="min-h-screen text-stone-800 dark:text-stone-200 font-sans flex items-center justify-center p-4">
                <div className="fixed top-0 left-0 w-full h-full overflow-hidden">
                    <div className="animated-blob blob-1 bg-amber-300 dark:bg-amber-900"></div>
                    <div className="animated-blob blob-2 bg-orange-300 dark:bg-orange-900"></div>
                </div>
                <div className="w-full max-w-md z-10">
                    <Card title="First-Time Setup">
                        <p className="text-xs text-stone-600 dark:text-gray-300 mb-4">
                            Welcome! Please enter your signup key and create an account to secure this application.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Signup Key"
                                id="signup-key"
                                value={signupKey}
                                onChange={e => setSignupKey(e.target.value)}
                                required
                                placeholder="Enter the key provided by admin"
                            />
                            <Input
                                label="MDM Incharge / Username"
                                id="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                            <Input
                                label="Password (min. 6 characters)"
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                            <Input
                                label="Confirm Password"
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                            <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                                <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">Password Recovery</legend>
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="security-question" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Security Question</label>
                                        <select
                                            id="security-question"
                                            value={securityQuestion}
                                            onChange={e => setSecurityQuestion(e.target.value)}
                                            className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-900 dark:text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                                        >
                                            {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                        </select>
                                    </div>
                                    <Input
                                        label="Your Answer (case-insensitive)"
                                        id="security-answer"
                                        value={securityAnswer}
                                        onChange={e => setSecurityAnswer(e.target.value)}
                                        required
                                    />
                                </div>
                            </fieldset>

                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="terms-agree"
                                    checked={agreedToTerms}
                                    onChange={e => setAgreedToTerms(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                <label htmlFor="terms-agree" className="text-xs text-stone-600 dark:text-gray-300">
                                    I have read and agree to the{' '}
                                    <button
                                        type="button"
                                        onClick={() => setIsTermsModalOpen(true)}
                                        className="font-semibold text-amber-600 hover:underline focus:outline-none"
                                    >
                                        Terms and Conditions
                                    </button>
                                </label>
                            </div>
                            
                            <Button type="submit" className="w-full" disabled={!agreedToTerms}>Complete Setup</Button>
                        </form>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default SetupPage;
