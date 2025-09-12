


import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { SIGNUP_KEY } from '../../constants';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import TermsModal from '../ui/TermsModal';
import PasswordInput from '../ui/PasswordInput';

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
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    const [errors, setErrors] = useState({
        signupKey: '',
        username: '',
        contact: '',
        password: '',
        confirmPassword: '',
        securityAnswer: '',
        terms: '',
    });

    const validate = useCallback((fieldName?: keyof typeof errors) => {
        const newErrors = { ...errors };
        
        const validators: Record<keyof typeof errors, () => string> = {
            signupKey: () => {
                if (!signupKey) return 'Signup Key is required.';
                if (signupKey.trim() !== SIGNUP_KEY) return 'Invalid Signup Key. Please contact an administrator.';
                return '';
            },
            username: () => !username ? 'Username is required.' : '',
            contact: () => {
                if (contact && !/^\d{10}$/.test(contact)) return 'Contact number must be 10 digits.';
                return '';
            },
            password: () => {
                if (!password) return 'Password is required.';
                if (password.length < 6) return 'Password must be at least 6 characters long.';
                return '';
            },
            confirmPassword: () => {
                if (!confirmPassword) return 'Please confirm your password.';
                if (password && confirmPassword !== password) return 'Passwords do not match.';
                return '';
            },
            securityAnswer: () => !securityAnswer ? 'Security answer is required.' : '',
            terms: () => !agreedToTerms ? 'You must agree to the Terms and Conditions to proceed.' : '',
        };

        if (fieldName) {
            newErrors[fieldName] = validators[fieldName]();
            // Also re-validate confirmPassword when password changes
            if (fieldName === 'password' && confirmPassword) {
                newErrors.confirmPassword = validators.confirmPassword();
            }
        } else {
            // Validate all fields
            (Object.keys(validators) as Array<keyof typeof errors>).forEach(key => {
                newErrors[key] = validators[key]();
            });
        }
        
        setErrors(newErrors);
        return Object.values(newErrors).every(error => error === '');
    }, [signupKey, username, contact, password, confirmPassword, securityAnswer, agreedToTerms, errors]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setupAccount({
                username,
                contact,
                password,
                securityQuestion,
                securityAnswer,
            });
            showToast('Setup complete! Welcome.', 'success');
        } else {
            showToast('Please correct the errors and try again.', 'error');
        }
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
                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            <div>
                                <Input
                                    label="Signup Key"
                                    id="signup-key"
                                    value={signupKey}
                                    onChange={e => setSignupKey(e.target.value)}
                                    onBlur={() => validate('signupKey')}
                                    required
                                    placeholder="Enter the key provided by admin"
                                    className={errors.signupKey ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                                />
                                {errors.signupKey ? (
                                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.signupKey}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-stone-500 dark:text-gray-400">This key is provided by the administrator to activate the app.</p>
                                )}
                            </div>
                            <div>
                                <Input
                                    label="MDM Incharge / Username"
                                    id="username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    onBlur={() => validate('username')}
                                    required
                                    className={errors.username ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                                />
                                 {errors.username ? (
                                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.username}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-stone-500 dark:text-gray-400">This name will be displayed on the dashboard and used in reports.</p>
                                )}
                            </div>
                             <div>
                                <Input
                                    label="Contact Number"
                                    id="contact"
                                    type="tel"
                                    maxLength={10}
                                    value={contact}
                                    onChange={e => setContact(e.target.value)}
                                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
                                    onBlur={() => validate('contact')}
                                    className={errors.contact ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                                />
                                {errors.contact && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.contact}</p>}
                            </div>
                            <div>
                                <PasswordInput
                                    label="Password (min. 6 characters)"
                                    id="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onBlur={() => validate('password')}
                                    required
                                    className={errors.password ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                                />
                                {errors.password ? (
                                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.password}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-stone-500 dark:text-gray-400">Use a mix of letters, numbers, and symbols for better security.</p>
                                )}
                            </div>
                            <div>
                                <PasswordInput
                                    label="Confirm Password"
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    onBlur={() => validate('confirmPassword')}
                                    required
                                    className={errors.confirmPassword ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                                />
                                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.confirmPassword}</p>}
                            </div>
                            
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
                                    <div>
                                        <Input
                                            label="Your Answer (case-insensitive)"
                                            id="security-answer"
                                            value={securityAnswer}
                                            onChange={e => setSecurityAnswer(e.target.value)}
                                            onBlur={() => validate('securityAnswer')}
                                            required
                                            className={errors.securityAnswer ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                                        />
                                        {errors.securityAnswer ? (
                                            <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.securityAnswer}</p>
                                        ) : (
                                            <p className="mt-1 text-xs text-stone-500 dark:text-gray-400">This is crucial for recovering your account if you forget your password.</p>
                                        )}
                                    </div>
                                </div>
                            </fieldset>

                            <div className="pt-2">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="terms-agree"
                                        checked={agreedToTerms}
                                        onChange={e => setAgreedToTerms(e.target.checked)}
                                        onBlur={() => validate('terms')}
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
                                 {errors.terms && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.terms}</p>}
                            </div>
                            
                            <Button type="submit" className="w-full">Complete Setup</Button>
                        </form>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default SetupPage;