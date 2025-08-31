
import React, { useState } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { CategoryBalance, Category, Receipt } from '../../types';

const Receipts: React.FC = () => {
    const { addReceipt, deleteReceipt, data } = useData();
    const { showToast } = useToast();
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [rice, setRice] = useState<Record<Category, string>>({ balvatika: '', primary: '', middle: '' });
    const [cash, setCash] = useState<Record<Category, string>>({ balvatika: '', primary: '', middle: '' });
    const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);

    const handleValueChange = (
        setter: React.Dispatch<React.SetStateAction<Record<Category, string>>>,
        category: Category,
        value: string
    ) => {
        setter(prev => ({ ...prev, [category]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const riceBalance: CategoryBalance = {
            balvatika: parseFloat(rice.balvatika) || 0,
            primary: parseFloat(rice.primary) || 0,
            middle: parseFloat(rice.middle) || 0,
        };
        
        const cashBalance: CategoryBalance = {
            balvatika: parseFloat(cash.balvatika) || 0,
            primary: parseFloat(cash.primary) || 0,
            middle: parseFloat(cash.middle) || 0,
        };

        const totalRice = riceBalance.balvatika + riceBalance.primary + riceBalance.middle;
        const totalCash = cashBalance.balvatika + cashBalance.primary + cashBalance.middle;

        if (!date || (totalRice === 0 && totalCash === 0)) {
            showToast('Please provide a date and at least one value.', 'error');
            return;
        }

        addReceipt({ date, rice: riceBalance, cash: cashBalance });
        showToast('Receipt saved successfully!', 'success');
        setRice({ balvatika: '', primary: '', middle: '' });
        setCash({ balvatika: '', primary: '', middle: '' });
    };

    const confirmDelete = () => {
        if (receiptToDelete) {
            deleteReceipt(receiptToDelete);
            showToast('Receipt deleted successfully!', 'success');
            setReceiptToDelete(null);
        }
    };

    return (
        <>
            <Modal isOpen={!!receiptToDelete} onClose={() => setReceiptToDelete(null)} title="Confirm Deletion">
                <p className="text-sm text-stone-600 dark:text-gray-300 mb-4">Are you sure you want to delete this receipt? This action cannot be undone.</p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setReceiptToDelete(null)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>
            <div className="space-y-4">
                <Card title="Add New Receipt">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input label="Date" id="receipt-date" type="date" value={date} onChange={e => setDate(e.target.value)} required max={new Date().toISOString().slice(0, 10)}/>
                        
                        <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                            <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">Rice Received (kg)</legend>
                            <div className="grid grid-cols-3 gap-2">
                                <Input label="Balvatika" id="rice-bal" type="number" step="0.01" placeholder="0" value={rice.balvatika} onChange={e => handleValueChange(setRice, 'balvatika', e.target.value)} min="0" max="9999" />
                                <Input label="Primary" id="rice-pri" type="number" step="0.01" placeholder="0" value={rice.primary} onChange={e => handleValueChange(setRice, 'primary', e.target.value)} min="0" max="9999" />
                                <Input label="Middle" id="rice-mid" type="number" step="0.01" placeholder="0" value={rice.middle} onChange={e => handleValueChange(setRice, 'middle', e.target.value)} min="0" max="9999" />
                            </div>
                        </fieldset>

                        <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                            <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">Cash Received (₹)</legend>
                            <div className="grid grid-cols-3 gap-2">
                                <Input label="Balvatika" id="cash-bal" type="number" step="0.01" placeholder="0" value={cash.balvatika} onChange={e => handleValueChange(setCash, 'balvatika', e.target.value)} min="0" max="99999" />
                                <Input label="Primary" id="cash-pri" type="number" step="0.01" placeholder="0" value={cash.primary} onChange={e => handleValueChange(setCash, 'primary', e.target.value)} min="0" max="99999" />
                                <Input label="Middle" id="cash-mid" type="number" step="0.01" placeholder="0" value={cash.middle} onChange={e => handleValueChange(setCash, 'middle', e.target.value)} min="0" max="99999" />
                            </div>
                        </fieldset>

                        <Button type="submit" className="w-full">Save Receipt</Button>
                    </form>
                </Card>
                <Card title="Recent Receipts">
                    <div className="overflow-x-auto max-h-60">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-amber-100/60 dark:bg-gray-800/50 sticky top-0">
                                <tr>
                                    <th className="p-2">Date</th>
                                    <th className="p-2 text-right">Rice (kg)</th>
                                    <th className="p-2 text-right">Cash (₹)</th>
                                    <th className="p-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.receipts.length === 0 ? (
                                    <tr className="border-b border-amber-200/50 dark:border-gray-700">
                                        <td colSpan={4} className="p-4 text-center text-stone-500 dark:text-gray-400">
                                            No receipts have been added yet.
                                        </td>
                                    </tr>
                                ) : (
                                    [...data.receipts].reverse().map(receipt => {
                                        const totalRice = receipt.rice.balvatika + receipt.rice.primary + receipt.rice.middle;
                                        const totalCash = receipt.cash.balvatika + receipt.cash.primary + receipt.cash.middle;
                                        return (
                                            <tr key={receipt.id} className="border-b border-amber-200/50 dark:border-gray-700">
                                                <td className="p-2">{new Date(receipt.date + 'T00:00:00').toLocaleDateString('en-IN')}</td>
                                                <td className="p-2 text-right">{totalRice.toFixed(2)}</td>
                                                <td className="p-2 text-right">{totalCash.toFixed(2)}</td>
                                                <td className="p-2 text-right">
                                                    <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => setReceiptToDelete(receipt.id)}>Delete</Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default Receipts;