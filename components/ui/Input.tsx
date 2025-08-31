import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
    containerClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, containerClassName = '', className, ...props }) => {
    const baseClasses = "w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-900 dark:text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 placeholder-stone-500 dark:placeholder-gray-400";
    return (
        <div className={containerClassName}>
            <label htmlFor={id} className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">
                {label}
            </label>
            <input id={id} className={`${baseClasses} ${className || ''}`} {...props} />
        </div>
    );
};

export default Input;