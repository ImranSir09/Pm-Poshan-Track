
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { DailyEntry } from '../../types';
import { useToast } from '../../hooks/useToast';
import Modal from '../ui/Modal';
import NumberInput from '../ui/NumberInput';
import Input from '../ui/Input';

const NO_MEAL_REASONS = [
    "Foodgrains not available",
    "Cook-cum-helper not available",
    "Funds not available",
    "Less attendance",
    "Holiday (Gazetted)",
    "Holiday (Local/Restricted)",
    "Other Reasons"
];

const DailyEntryPage: React.FC = () => {
    const { data, addEntry } = useData();
    const { showToast } = useToast();
    const { settings } = data;
    const { rates } = settings;

    const onRoll = useMemo(() => {
        const totals = { balvatika: 0, primary: 0, middle: 0 };
        if (!settings.classRolls) return totals;

        settings.classRolls.forEach(c => {
            const classTotal = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
            if (['bal', 'pp1', 'pp2'].includes(c.id)) {
                totals.balvatika += classTotal;
            } else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) {
                totals.primary += classTotal;
            } else if (['c6', 'c7', 'c8'].includes(c.id)) {
                totals.middle += classTotal;
            }
        });
        return totals;
    }, [settings.classRolls]);
    
    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);
    const [selectedDate, setSelectedDate] = useState(today);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [present, setPresent] = useState({ balvatika: 0, primary: 0, middle: 0 });
    const [consumption, setConsumption] = useState({ rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, total: 0 });
    
    const [isEntryModalOpen, setEntryModalOpen] = useState(false);
    const [isOverwriteModalOpen, setOverwriteModalOpen] = useState(false);
    const [isReasonModalOpen, setReasonModalOpen] = useState(false);
    const [reasonForNoMeal, setReasonForNoMeal] = useState('');
    const [pendingEntry, setPendingEntry] = useState<DailyEntry | null>(null);

    const isSunday = useMemo(() => new Date(selectedDate + 'T00:00:00').getDay() === 0, [selectedDate]);
    const entryExists = useMemo(() => data.entries.some(e => e.id === selectedDate), [data.entries, selectedDate]);

    // Handle deep-linking from notifications
    useEffect(() => {
        const dateToOpen = sessionStorage.getItem('openEntryForDate');
        if (dateToOpen) {
            sessionStorage.removeItem('openEntryForDate');
            setSelectedDate(dateToOpen);
            // Timeout ensures state update propagates before modal opens
            setTimeout(() => setEntryModalOpen(true), 100);
        }
    }, []);
    
    const calculateConsumption = useCallback(() => {
        const balvatikaRice = (present.balvatika * rates.rice.balvatika) / 1000;
        const primaryRice = (present.primary * rates.rice.primary) / 1000;
        const middleRice = (present.middle * rates.rice.middle) / 1000;
        const totalRice = balvatikaRice + primaryRice + middleRice;

        const dalVeg = (present.balvatika * rates.dalVeg.balvatika) + (present.primary * rates.dalVeg.primary) + (present.middle * rates.dalVeg.middle);
        const oilCond = (present.balvatika * rates.oilCond.balvatika) + (present.primary * rates.oilCond.primary) + (present.middle * rates.oilCond.middle);
        const salt = (present.balvatika * rates.salt.balvatika) + (present.primary * rates.salt.primary) + (present.middle * rates.salt.middle);
        const fuel = (present.balvatika * rates.fuel.balvatika) + (present.primary * rates.fuel.primary) + (present.middle * rates.fuel.middle);

        const totalExpenditure = dalVeg + oilCond + salt + fuel;

        setConsumption({
            rice: parseFloat(totalRice.toFixed(3)),
            dalVeg: parseFloat(dalVeg.toFixed(2)),
            oilCond: parseFloat(oilCond.toFixed(2)),
            salt: parseFloat(salt.toFixed(2)),
            fuel: parseFloat(fuel.toFixed(2)),
            total: parseFloat(totalExpenditure.toFixed(2)),
        });
    }, [present, rates]);

    useEffect(() => {
        calculateConsumption();
    }, [present, calculateConsumption]);

    useEffect(() => {
        const entryForDate = data.entries.find(e => e.id === selectedDate);
        if (entryForDate) {
            setPresent(entryForDate.present);
        } else {
            setPresent({ balvatika: 0, primary: 0, middle: 0 });
        }
    }, [selectedDate, data.entries]);

    const handlePresentChange = (category: keyof typeof present, value: number) => {
        setPresent(prev => ({ ...prev, [category]: value }));
    };

    const initiateSaveProcess = (entry: DailyEntry, overwrite = false) => {
        const success = addEntry(entry, overwrite);
        if (success) {
            showToast(`Entry for ${entry.date} ${overwrite || entryExists ? 'updated' : 'saved'} successfully!`, 'success');
            setEntryModalOpen(false);
        } else if (settings.autoOverwrite) {
            addEntry(entry, true);
            showToast(`Entry for ${entry.date} updated successfully!`, 'success');
            setEntryModalOpen(false);
        } else {
            setPendingEntry(entry);
            setOverwriteModalOpen(true);
        }
    };

    const handleSave = () => {
        if (!selectedDate) {
            showToast('Please select a date.', 'error');
            return;
        }
        const totalPresent = present.balvatika + present.primary + present.middle;

        if (totalPresent > 0) {
            const newEntry: DailyEntry = {
                id: selectedDate,
                date: selectedDate,
                present,
                totalPresent,
                consumption,
            };
            initiateSaveProcess(newEntry);
        } else {
            const existingEntry = data.entries.find(e => e.id === selectedDate);
            setReasonForNoMeal(existingEntry?.reasonForNoMeal || "");
            setReasonModalOpen(true);
        }
    };
    
    const handleSaveZeroEntry = () => {
        if (!reasonForNoMeal) {
            showToast('Please select a reason.', 'error');
            return;
        }
        const zeroEntry: DailyEntry = {
            id: selectedDate,
            date: selectedDate,
            present: { balvatika: 0, primary: 0, middle: 0 },
            totalPresent: 0,
            consumption: { rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, total: 0 },
            reasonForNoMeal: reasonForNoMeal,
        };
        setReasonModalOpen(false);
        initiateSaveProcess(zeroEntry);
    };

    const confirmOverwrite = () => {
        if (pendingEntry) {
            initiateSaveProcess(pendingEntry, true);
        }
        setOverwriteModalOpen(false);
        setPendingEntry(null);
    }

    return (
        <>
             <Modal isOpen={isEntryModalOpen} onClose={() => setEntryModalOpen(false)} title={`Entry for ${new Date(selectedDate+'T00:00:00').toLocaleDateString('en-IN')}`} zIndex="z-40">
                <div className="space-y-4">
                     <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                        <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">Students Present</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <NumberInput label={`Balvatika (${onRoll.balvatika})`} id="balvatika" value={present.balvatika} onChange={val => handlePresentChange('balvatika', val)} min={0} max={onRoll.balvatika} />
                            <NumberInput label={`Primary (${onRoll.primary})`} id="primary" value={present.primary} onChange={val => handlePresentChange('primary', val)} min={0} max={onRoll.primary} />
                            <NumberInput label={`Middle (${onRoll.middle})`} id="middle" value={present.middle} onChange={val => handlePresentChange('middle', val)} min={0} max={onRoll.middle} />
                        </div>
                    </fieldset>

                     <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                        <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">Auto-calculated Consumption</legend>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            {Object.entries(consumption).map(([key, value]) => (
                                <div key={key} className="bg-amber-100/40 dark:bg-gray-800/50 p-2 rounded-md">
                                    <p className="text-xs text-stone-500 dark:text-gray-400 capitalize">{key === 'dalVeg' ? 'Dal & Veg' : key === 'oilCond' ? 'Oil & Cond.' : key}</p>
                                    <p className="font-semibold text-stone-800 dark:text-white">{key === 'rice' ? `${value} kg` : `₹${value}`}</p>
                                </div>
                            ))}
                        </div>
                    </fieldset>
                    
                    <Button onClick={handleSave} className="w-full">
                        {entryExists ? 'Update Entry' : 'Save Entry'}
                    </Button>
                </div>
            </Modal>
            <Modal isOpen={isOverwriteModalOpen} onClose={() => setOverwriteModalOpen(false)} title="Confirm Overwrite" zIndex="z-50">
                <p className="text-sm text-stone-600 dark:text-gray-300 mb-4">An entry for this date already exists. Do you want to overwrite it?</p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setOverwriteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmOverwrite}>Overwrite</Button>
                </div>
            </Modal>
             <Modal isOpen={isReasonModalOpen} onClose={() => setReasonModalOpen(false)} title="Reason for No Meal" zIndex="z-50">
                <div className="space-y-4">
                    <p className="text-sm text-stone-600 dark:text-gray-300">Please provide a reason for not serving the meal today.</p>
                    <div>
                        <label htmlFor="reason-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Reason</label>
                        <select
                            id="reason-select"
                            value={reasonForNoMeal}
                            onChange={(e) => setReasonForNoMeal(e.target.value)}
                            className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                        >
                            <option value="">Select a reason...</option>
                            {NO_MEAL_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setReasonModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveZeroEntry}>Save Entry</Button>
                    </div>
                </div>
            </Modal>
            <Card title="Daily Meal Entry">
                 {showDatePicker ? (
                    <div className="space-y-3">
                        <Input label="Select Date" id="entry-date" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={today} />
                         {isSunday && (
                            <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-300 text-xs">
                                Entries are disabled for Sundays.
                            </div>
                        )}
                        <div className="flex space-x-2">
                            <Button onClick={() => setEntryModalOpen(true)} className="w-full" disabled={isSunday}>
                                Load & Edit Entry
                            </Button>
                            <Button variant="secondary" onClick={() => { setShowDatePicker(false); setSelectedDate(today); }} className="w-full">
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                                <p className="text-sm text-stone-500 dark:text-gray-400">{new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p>
                            </div>
                            <div className="text-right">
                                <Button onClick={() => { setSelectedDate(today); setEntryModalOpen(true); }} disabled={isSunday}>
                                    Add / Edit
                                </Button>
                                <button onClick={() => setShowDatePicker(true)} className="block w-full text-center text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 text-xs pt-1">
                                    Edit another...
                                </button>
                            </div>
                        </div>
                        {isSunday && selectedDate === today && (
                            <div className="text-center mt-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-300 text-xs">
                                Entries are disabled for today (Sunday).
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </>
    );
};

export default DailyEntryPage;
