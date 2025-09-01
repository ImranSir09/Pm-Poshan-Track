
import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
    return (
        <div className={`bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-xl border border-amber-200/50 dark:border-white/20 shadow-md dark:shadow-lg p-4 ${className}`}>
            {title && <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-4">{title}</h2>}
            {children}
        </div>
    );
};

export default Card;
