import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import TermsModal from '../ui/TermsModal';
import PasswordInput from '../ui/PasswordInput';

const LoginPage: React.FC = () => {
    const { login, resetPassword } = useAuth();
    const { data } = useData();
    const { showToast } = useToast();
    
    const [password, setPassword] = useState('');
    const [isForgotModalOpen, setForgotModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!login(password)) {
            showToast('Incorrect password.', 'error');
        }
    };

    const handleResetPassword = () => {
        if (!securityAnswer || !newPassword) {
            showToast('Please fill in all fields.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showToast('New password must be at least 6 characters.', 'error');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            showToast('New passwords do not match.', 'error');
            return;
        }
        
        const success = resetPassword(securityAnswer, newPassword);
        if (success) {
            showToast('Password reset successfully! You can now log in.', 'success');
            setForgotModalOpen(false);
            setSecurityAnswer('');
            setNewPassword('');
            setConfirmNewPassword('');
        } else {
            showToast('Security answer is incorrect.', 'error');
        }
    };

    return (
        <>
            <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
            <Modal isOpen={isForgotModalOpen} onClose={() => setForgotModalOpen(false)} title="Reset Password">
                <div className="space-y-4">
                    <div>
                        <p className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Your Security Question:</p>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 p-2 bg-amber-100/60 dark:bg-gray-700/50 rounded-lg">
                            {data.auth?.securityQuestion}
                        </p>
                    </div>
                    <Input
                        label="Your Answer"
                        id="reset-answer"
                        value={securityAnswer}
                        onChange={e => setSecurityAnswer(e.target.value)}
                    />
                     <PasswordInput
                        label="New Password (min. 6 characters)"
                        id="reset-new-password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                    />
                     <PasswordInput
                        label="Confirm New Password"
                        id="reset-confirm-password"
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                    />
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setForgotModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword}>Reset Password</Button>
                    </div>
                </div>
            </Modal>

            <div className="min-h-screen text-stone-800 dark:text-stone-200 font-sans flex items-center justify-center p-4">
                <div className="fixed top-0 left-0 w-full h-full overflow-hidden">
                    <div className="animated-blob blob-1 bg-amber-300 dark:bg-amber-900"></div>
                    <div className="animated-blob blob-2 bg-orange-300 dark:bg-orange-900"></div>
                </div>
                <div className="w-full max-w-sm z-10">
                     <div className="text-center mb-4">
                        <div className="inline-block p-3 bg-amber-500 rounded-full mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <h1 className="text-xl font-bold text-stone-900 dark:text-white">Welcome, {data.auth?.username}</h1>
                        <p className="text-sm text-stone-500 dark:text-gray-300">PM POSHAN Tracker</p>
                    </div>
                    <Card>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <PasswordInput
                                label="Password"
                                id="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                            <Button type="submit" className="w-full">Login</Button>
                            <button
                                type="button"
                                onClick={() => setForgotModalOpen(true)}
                                className="block w-full text-center text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 text-xs pt-1"
                            >
                                Forgot Password?
                            </button>
                        </form>
                    </Card>
                     <div className="text-center mt-6">
                        <button
                            type="button"
                            onClick={() => setIsTermsModalOpen(true)}
                            className="text-xs text-stone-500 dark:text-gray-400 hover:underline"
                        >
                            View Terms and Conditions
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;