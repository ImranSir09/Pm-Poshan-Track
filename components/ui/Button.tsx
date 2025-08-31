
import React, { ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'px-4 py-2 text-sm font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 transition-transform transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400',
        secondary: 'bg-stone-500 hover:bg-stone-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white focus:ring-stone-500',
        danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    };

    return (
        <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;