import React from 'react';

interface NumberInputProps {
    label: string;
    id: string;
    value: number;
    onChange: (newValue: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, id, value, onChange, min = 0, max, step = 1, disabled = false }) => {
    const handleIncrement = () => {
        const newValue = parseFloat((value + step).toPrecision(15));
        if (max === undefined || newValue <= max) {
            onChange(newValue);
        }
    };

    const handleDecrement = () => {
        const newValue = parseFloat((value - step).toPrecision(15));
        if (min === undefined || newValue >= min) {
            onChange(newValue);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = parseFloat(e.target.value);
        if (isNaN(numValue)) {
            onChange(min); // or handle as empty string if needed
            return;
        }

        let finalValue = numValue;
        if (max !== undefined && finalValue > max) finalValue = max;
        if (min !== undefined && finalValue < min) finalValue = min;
        
        onChange(finalValue);
    };

    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">
                {label}
            </label>
            <div className="flex items-center">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={disabled || value <= min}
                    className="px-2 py-2.5 bg-amber-200/50 hover:bg-amber-300/50 dark:bg-gray-600/50 dark:hover:bg-gray-700/70 text-stone-800 dark:text-white rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Decrease ${label}`}
                >
                    -
                </button>
                <input
                    id={id}
                    type="number"
                    value={value}
                    onChange={handleChange}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    className="w-full bg-amber-100/60 dark:bg-gray-700/50 border-y border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm text-center focus:ring-amber-500 focus:border-amber-500 block p-2.5 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={disabled || (max !== undefined && value >= max)}
                    className="px-2 py-2.5 bg-amber-200/50 hover:bg-amber-300/50 dark:bg-gray-600/50 dark:hover:bg-gray-700/70 text-stone-800 dark:text-white rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Increase ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
};

export default NumberInput;