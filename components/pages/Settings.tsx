
import React, { useState, useMemo } from 'react';
import { nanoid } from 'nanoid';
import { Accordion, AccordionItem } from '../ui/Accordion';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { Settings, SchoolDetails, Rates, Category, CookCumHelper, ClassRoll, MonthlyBalanceData, MDMIncharge, NotificationSettings } from '../../types';
import { useToast } from '../../hooks/useToast';
import { CLASS_STRUCTURE } from '../../constants';


const calculateSectionTotals = (classes: ClassRoll[]) => {
    return classes.reduce((acc, cr) => {
        acc.general.boys += cr.general.boys;
        acc.general.girls += cr.general.girls;
        acc.stsc.boys += cr.stsc.boys;
        acc.stsc.girls += cr.stsc.girls;
        acc.total.boys += cr.general.boys + cr.stsc.boys;
        acc.total.girls += cr.general.girls + cr.stsc.girls;
        acc.total.onRoll += cr.general.boys + cr.general.girls + cr.stsc.boys + cr.stsc.girls;
        return acc;
    }, {
        general: { boys: 0, girls: 0 },
        stsc: { boys: 0, girls: 0 },
        total: { boys: 0, girls: 0, onRoll: 0 },
    });
};

const SectionTotalRow: React.FC<{ label: string, totals: ReturnType<typeof calculateSectionTotals> }> = ({ label, totals }) => (
    <tr className="font-bold bg-amber-200/40 dark:bg-gray-800/70">
        <td className="p-2 border border-amber-300/50 dark:border-gray-600">{label}</td>
        <td className="p-2 border border-amber-300/50 dark:border-gray-600">{totals.general.boys}</td>
        <td className="p-2 border border-amber-300/50 dark:border-gray-600">{totals.general.girls}</td>
        <td className="p-2 border border-amber-300/50 dark:border-gray-600">{totals.stsc.boys}</td>
        <td className="p-2 border border-amber-300/50 dark:border-gray-600">{totals.stsc.girls}</td>
        <td className="p-2 border border-amber-300/50 dark:border-gray-600">{totals.total.boys}</td>
        <td className="p-2 border border-amber-300/50 dark:border-gray-600">{totals.total.girls}</td>
        <td className="p-2 border border-amber-300/50 dark:border-gray-600 text-amber-700 dark:text-amber-400">{totals.total.onRoll}</td>
    </tr>
);

const SettingsPage: React.FC = () => {
    const { data, updateSettings } = useData();
    const [settings, setSettings] = useState<Settings>(data.settings);
    const { showToast } = useToast();
    const [isUdiseValid, setIsUdiseValid] = useState(settings.schoolDetails.udise.length === 11 || settings.schoolDetails.udise.length === 0);

    const handleSchoolDetailsChange = (field: keyof SchoolDetails, value: string) => {
        if (field === 'udise') {
            setIsUdiseValid(value.length === 11 || value.length === 0);
        }
        setSettings(prev => ({...prev, schoolDetails: {...prev.schoolDetails, [field]: value}}));
    }

    const handleInchargeChange = (field: keyof MDMIncharge, value: string) => {
        setSettings(prev => ({
            ...prev,
            mdmIncharge: {
                ...(prev.mdmIncharge || { name: '', contact: '' }),
                [field]: value
            }
        }));
    };
    
    const handleClassRollChange = (classId: string, category: 'general' | 'stsc', gender: 'boys' | 'girls', value: string) => {
        const numValue = parseInt(value) || 0;
        setSettings(prev => ({
            ...prev,
            classRolls: prev.classRolls.map(cr => 
                cr.id === classId 
                ? { ...cr, [category]: { ...cr[category], [gender]: numValue } }
                : cr
            )
        }));
    };

    const handleRateChange = (rateType: keyof Rates, category: Category, value: string) => {
        setSettings(prev => ({ ...prev, rates: { ...prev.rates, [rateType]: { ...prev.rates[rateType], [category]: parseFloat(value) || 0 }}}));
    };
    
     const handleOpeningBalanceChange = (
        type: keyof MonthlyBalanceData,
        category: Category,
        value: string
    ) => {
        const numValue = parseFloat(value) || 0;
        setSettings(prev => ({
            ...prev,
            initialOpeningBalance: {
                ...(prev.initialOpeningBalance || { 
                    rice: { balvatika: 0, primary: 0, middle: 0 }, 
                    cash: { balvatika: 0, primary: 0, middle: 0 } 
                }),
                [type]: {
                    ...(prev.initialOpeningBalance?.[type] || { balvatika: 0, primary: 0, middle: 0 }),
                    [category]: numValue,
                },
            },
        }));
    };
    
    const handleNotificationChange = (field: keyof NotificationSettings, value: string | boolean) => {
        const finalValue = typeof value === 'boolean' ? value : parseInt(value, 10) || 0;
        setSettings(prev => ({
            ...prev,
            notificationSettings: {
                ...(prev.notificationSettings || { enabled: true, lowRiceThreshold: 10, lowCashThreshold: 500, backupReminderFrequency: 30 }),
                [field]: finalValue,
            },
        }));
    };

    const handleCookChange = (id: string, field: keyof CookCumHelper, value: string | number) => {
        setSettings(prev => ({
            ...prev,
            cooks: prev.cooks.map(cook => cook.id === id ? { ...cook, [field]: value } : cook)
        }));
    };

    const addCook = () => {
        const newCook: CookCumHelper = { id: nanoid(), name: '', gender: 'Female', category: 'GEN', paymentMode: 'Bank', amountPaid: 0 };
        setSettings(prev => ({...prev, cooks: [...prev.cooks, newCook]}));
    };

    const removeCook = (id: string) => {
        setSettings(prev => ({ ...prev, cooks: prev.cooks.filter(cook => cook.id !== id) }));
    };

    const handleHealthChange = (field: keyof Settings['healthStatus'], value: string) => {
        setSettings(prev => ({ ...prev, healthStatus: { ...prev.healthStatus, [field]: parseInt(value) || 0 }}));
    }

    const handleInspectionChange = (field: keyof Settings['inspectionReport'], value: string | boolean) => {
        const finalValue = typeof value === 'boolean' ? value : parseInt(value) || 0;
        setSettings(prev => ({ ...prev, inspectionReport: { ...prev.inspectionReport, [field]: finalValue }}));
    }

    const handleSave = () => {
        const isUdiseCorrectLength = settings.schoolDetails.udise.length === 11 || settings.schoolDetails.udise.length === 0;
        setIsUdiseValid(isUdiseCorrectLength);

        if (!isUdiseCorrectLength) {
            showToast('UDISE code must be 11 digits.', 'error');
            return;
        }
        updateSettings(settings);
        showToast('Settings saved successfully!', 'success');
    };

    const { middleClasses, primaryClasses, prePrimaryClasses, grandTotal } = useMemo(() => {
        const classOrder = CLASS_STRUCTURE.reduce((acc, c, index) => {
            acc[c.id] = index;
            return acc;
        }, {} as Record<string, number>);

        const sortFunction = (a: ClassRoll, b: ClassRoll) => (classOrder[a.id] ?? 99) - (classOrder[b.id] ?? 99);
        
        const allRolls = settings.classRolls || [];
        
        const middle = allRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id)).sort(sortFunction);
        const primary = allRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)).sort(sortFunction);
        const prePrimary = allRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id)).sort(sortFunction);

        const total = calculateSectionTotals(allRolls);
        return { middleClasses: middle, primaryClasses: primary, prePrimaryClasses: prePrimary, grandTotal: total };
    }, [settings.classRolls]);

    const middleTotals = useMemo(() => calculateSectionTotals(middleClasses), [middleClasses]);
    const primaryTotals = useMemo(() => calculateSectionTotals(primaryClasses), [primaryClasses]);
    const prePrimaryTotals = useMemo(() => calculateSectionTotals(prePrimaryClasses), [prePrimaryClasses]);


    return (
        <div className="pb-20">
            <div className="space-y-4">
                <Accordion defaultOpenId="general">
                    <AccordionItem id="general" title="General & MDM Details">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-2">School Information</h3>
                                <div className="space-y-3">
                                    <Input label="School Name" id="schoolName" value={settings.schoolDetails.name} onChange={e => handleSchoolDetailsChange('name', e.target.value)} />
                                    <div>
                                        <Input 
                                            label="UDISE Code (11 digits)" 
                                            id="udise" 
                                            type="number" 
                                            value={settings.schoolDetails.udise} 
                                            onChange={e => handleSchoolDetailsChange('udise', e.target.value)}
                                            onInput={(e) => { if (e.currentTarget.value.length > 11) e.currentTarget.value = e.currentTarget.value.slice(0, 11); }}
                                            className={!isUdiseValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                                        />
                                        {!isUdiseValid && <p className="mt-1 text-xs text-red-500 dark:text-red-400">UDISE code must be 11 digits long.</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-2">MDM Incharge</h3>
                                <div className="grid md:grid-cols-2 gap-3">
                                    <Input 
                                        label="Incharge Name" 
                                        id="incharge-name" 
                                        value={settings.mdmIncharge?.name || ''} 
                                        onChange={e => handleInchargeChange('name', e.target.value)} 
                                    />
                                    <Input 
                                        label="Contact Number" 
                                        id="incharge-contact" 
                                        type="tel" 
                                        maxLength={10}
                                        value={settings.mdmIncharge?.contact || ''} 
                                        onChange={e => handleInchargeChange('contact', e.target.value)}
                                        onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-2">Preferences</h3>
                                <div className="flex items-center justify-between p-3 bg-amber-100/50 dark:bg-gray-800/50 rounded-lg">
                                    <div>
                                        <label htmlFor="auto-overwrite" className="font-medium text-stone-700 dark:text-gray-300">Auto-overwrite entry</label>
                                        <p className="text-xs text-stone-500 dark:text-gray-400">Automatically overwrite daily entries without asking.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="auto-overwrite" className="sr-only peer" checked={settings.autoOverwrite} onChange={e => setSettings(p => ({...p, autoOverwrite: e.target.checked}))} />
                                        <div className="w-11 h-6 bg-stone-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </AccordionItem>
                    
                    <AccordionItem id="notifications" title="Notifications">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-amber-100/50 dark:bg-gray-800/50 rounded-lg">
                                <div>
                                    <label htmlFor="notifications-enabled" className="font-medium text-stone-700 dark:text-gray-300">Enable Notifications</label>
                                    <p className="text-xs text-stone-500 dark:text-gray-400">Show alerts for low stock and backup reminders.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="notifications-enabled" className="sr-only peer" checked={settings.notificationSettings?.enabled} onChange={e => handleNotificationChange('enabled', e.target.checked)} />
                                    <div className="w-11 h-6 bg-stone-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                </label>
                            </div>
                            {settings.notificationSettings?.enabled && (
                                <div className="space-y-3">
                                    <Input 
                                        label="Low Rice Threshold (kg)" 
                                        id="low-rice" type="number" 
                                        value={settings.notificationSettings.lowRiceThreshold} 
                                        onChange={e => handleNotificationChange('lowRiceThreshold', e.target.value)} 
                                    />
                                    <Input 
                                        label="Low Cash Threshold (₹)" 
                                        id="low-cash" 
                                        type="number" 
                                        value={settings.notificationSettings.lowCashThreshold} 
                                        onChange={e => handleNotificationChange('lowCashThreshold', e.target.value)} 
                                    />
                                    <Input 
                                        label="Backup Reminder Frequency (days)" 
                                        id="backup-freq" 
                                        type="number" 
                                        value={settings.notificationSettings.backupReminderFrequency} 
                                        onChange={e => handleNotificationChange('backupReminderFrequency', e.target.value)} 
                                    />
                                </div>
                            )}
                        </div>
                    </AccordionItem>

                    <AccordionItem id="enrollment" title="Student Enrollment (Roll Statement)">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-center border-collapse">
                                <thead className="bg-amber-100/60 dark:bg-gray-800/50">
                                    <tr>
                                        <th rowSpan={2} className="p-2 border border-amber-300/50 dark:border-gray-600">Class</th>
                                        <th colSpan={2} className="p-2 border border-amber-300/50 dark:border-gray-600">General</th>
                                        <th colSpan={2} className="p-2 border border-amber-300/50 dark:border-gray-600">ST/SC</th>
                                        <th colSpan={2} className="p-2 border border-amber-300/50 dark:border-gray-600">Total</th>
                                        <th rowSpan={2} className="p-2 border border-amber-300/50 dark:border-gray-600">On Roll</th>
                                    </tr>
                                    <tr>
                                        <th className="p-2 border border-amber-300/50 dark:border-gray-600">Boys</th>
                                        <th className="p-2 border border-amber-300/50 dark:border-gray-600">Girls</th>
                                        <th className="p-2 border border-amber-300/50 dark:border-gray-600">Boys</th>
                                        <th className="p-2 border border-amber-300/50 dark:border-gray-600">Girls</th>
                                        <th className="p-2 border border-amber-300/50 dark:border-gray-600">Boys</th>
                                        <th className="p-2 border border-amber-300/50 dark:border-gray-600">Girls</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { title: 'Pre-Primary', classes: prePrimaryClasses, totals: prePrimaryTotals },
                                        { title: 'Primary (I-V)', classes: primaryClasses, totals: primaryTotals },
                                        { title: 'Middle (VI-VIII)', classes: middleClasses, totals: middleTotals }
                                    ].map(section => section.classes.length > 0 && (
                                        <React.Fragment key={section.title}>
                                            <tr className="bg-amber-100/40 dark:bg-gray-700/50">
                                                <td colSpan={8} className="p-1 font-bold text-amber-800 dark:text-amber-400 text-left pl-2">{section.title}</td>
                                            </tr>
                                            {section.classes.map(cr => {
                                                const totalBoys = cr.general.boys + cr.stsc.boys;
                                                const totalGirls = cr.general.girls + cr.stsc.girls;
                                                const onRoll = totalBoys + totalGirls;
                                                return (
                                                    <tr key={cr.id} className="border-b border-amber-200/50 dark:border-gray-700">
                                                        <td className="p-1 border border-amber-300/50 dark:border-gray-600 font-semibold">{cr.name}</td>
                                                        <td className="p-1 border border-amber-300/50 dark:border-gray-600"><input type="number" value={cr.general.boys} onChange={e => handleClassRollChange(cr.id, 'general', 'boys', e.target.value)} className="w-12 bg-amber-100/60 dark:bg-gray-700/50 rounded p-1 text-center"/></td>
                                                        <td className="p-1 border border-amber-300/50 dark:border-gray-600"><input type="number" value={cr.general.girls} onChange={e => handleClassRollChange(cr.id, 'general', 'girls', e.target.value)} className="w-12 bg-amber-100/60 dark:bg-gray-700/50 rounded p-1 text-center"/></td>
                                                        <td className="p-1 border border-amber-300/50 dark:border-gray-600"><input type="number" value={cr.stsc.boys} onChange={e => handleClassRollChange(cr.id, 'stsc', 'boys', e.target.value)} className="w-12 bg-amber-100/60 dark:bg-gray-700/50 rounded p-1 text-center"/></td>
                                                        <td className="p-1 border border-amber-300/50 dark:border-gray-600"><input type="number" value={cr.stsc.girls} onChange={e => handleClassRollChange(cr.id, 'stsc', 'girls', e.target.value)} className="w-12 bg-amber-100/60 dark:bg-gray-700/50 rounded p-1 text-center"/></td>
                                                        <td className="p-1 border border-amber-300/50 dark:border-gray-600 font-bold">{totalBoys}</td>
                                                        <td className="p-1 border border-amber-300/50 dark:border-gray-600 font-bold">{totalGirls}</td>
                                                        <td className="p-1 border border-amber-300/50 dark:border-gray-600 font-bold text-amber-700 dark:text-amber-400">{onRoll}</td>
                                                    </tr>
                                                );
                                            })}
                                            <SectionTotalRow label={`${section.title.split(' ')[0]} Total`} totals={section.totals} />
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold bg-amber-200/50 dark:bg-gray-800">
                                <SectionTotalRow label="Grand Total" totals={grandTotal} />
                                </tfoot>
                            </table>
                        </div>
                    </AccordionItem>
                    
                    <AccordionItem id="finance" title="Financial, Stock & Rates">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-2">Initial Opening Balance</h3>
                                <p className="text-xs text-stone-500 dark:text-gray-400 mb-3">
                                    Set the starting balance for the very first month of use. This is used as the opening balance until the first monthly summary is saved.
                                </p>
                                <div className="space-y-3">
                                    <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                                        <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">Opening Rice Balance (kg)</legend>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Input label="Balvatika" id="ob-rice-bal" type="number" step="0.001" value={settings.initialOpeningBalance?.rice?.balvatika || 0} onChange={e => handleOpeningBalanceChange('rice', 'balvatika', e.target.value)} />
                                            <Input label="Primary" id="ob-rice-pri" type="number" step="0.001" value={settings.initialOpeningBalance?.rice?.primary || 0} onChange={e => handleOpeningBalanceChange('rice', 'primary', e.target.value)} />
                                            <Input label="Middle" id="ob-rice-mid" type="number" step="0.001" value={settings.initialOpeningBalance?.rice?.middle || 0} onChange={e => handleOpeningBalanceChange('rice', 'middle', e.target.value)} />
                                        </div>
                                    </fieldset>
                                    <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                                        <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">Opening Cash Balance (₹)</legend>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Input label="Balvatika" id="ob-cash-bal" type="number" step="0.01" value={settings.initialOpeningBalance?.cash?.balvatika || 0} onChange={e => handleOpeningBalanceChange('cash', 'balvatika', e.target.value)} />
                                            <Input label="Primary" id="ob-cash-pri" type="number" step="0.01" value={settings.initialOpeningBalance?.cash?.primary || 0} onChange={e => handleOpeningBalanceChange('cash', 'primary', e.target.value)} />
                                            <Input label="Middle" id="ob-cash-mid" type="number" step="0.01" value={settings.initialOpeningBalance?.cash?.middle || 0} onChange={e => handleOpeningBalanceChange('cash', 'middle', e.target.value)} />
                                        </div>
                                    </fieldset>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-2">Food Rate Configuration</h3>
                                <div className="space-y-3 text-xs">
                                    {(Object.keys(settings.rates) as Array<keyof Rates>).map(rateKey => (
                                        <div key={rateKey}>
                                            <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1 capitalize">{rateKey.replace(/([A-Z])/g, ' $1')}</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Input label="Balvatika" id={`${rateKey}-bal`} type="number" step="0.01" value={settings.rates[rateKey].balvatika} onChange={e => handleRateChange(rateKey, 'balvatika', e.target.value)} min="0" max="999" />
                                                <Input label="Primary" id={`${rateKey}-pri`} type="number" step="0.01" value={settings.rates[rateKey].primary} onChange={e => handleRateChange(rateKey, 'primary', e.target.value)} min="0" max="999" />
                                                <Input label="Middle" id={`${rateKey}-mid`} type="number" step="0.01" value={settings.rates[rateKey].middle} onChange={e => handleRateChange(rateKey, 'middle', e.target.value)} min="0" max="999" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

                    <AccordionItem id="staff" title="Staff & Health Records">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-2">Cook-Cum-Helper Details</h3>
                                <div className="space-y-3">
                                    {settings.cooks.map((cook, index) => (
                                        <div key={cook.id} className="p-3 border border-amber-300/50 dark:border-gray-600 rounded-lg space-y-3">
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Cook #{index + 1}</p>
                                                <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => removeCook(cook.id)}>Remove</Button>
                                            </div>
                                            <Input label="Name" id={`cook-name-${cook.id}`} value={cook.name} onChange={e => handleCookChange(cook.id, 'name', e.target.value)} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Gender</label>
                                                    <select value={cook.gender} onChange={e => handleCookChange(cook.id, 'gender', e.target.value)} className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500">
                                                        <option>Female</option><option>Male</option><option>Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Category</label>
                                                    <select value={cook.category} onChange={e => handleCookChange(cook.id, 'category', e.target.value)} className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500">
                                                        <option>GEN</option><option>OBC</option><option>SC</option><option>ST</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Payment</label>
                                                    <select value={cook.paymentMode} onChange={e => handleCookChange(cook.id, 'paymentMode', e.target.value)} className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500">
                                                        <option>Bank</option><option>Cash</option><option>Cheque</option>
                                                    </select>
                                                </div>
                                                <Input label="Amount Paid" type="number" id={`cook-amount-${cook.id}`} value={cook.amountPaid} onChange={e => handleCookChange(cook.id, 'amountPaid', parseFloat(e.target.value) || 0)} />
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="secondary" onClick={addCook} className="w-full">Add Cook</Button>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-stone-700 dark:text-gray-300 mb-2">Health & Inspection Report</h3>
                                <div className="space-y-3">
                                    <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                                        <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">IFA Tablet Beneficiaries</legend>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input label="Boys" id="ifa-boys" type="number" value={settings.healthStatus.ifaBoys} onChange={e => handleHealthChange('ifaBoys', e.target.value)} />
                                            <Input label="Girls" id="ifa-girls" type="number" value={settings.healthStatus.ifaGirls} onChange={e => handleHealthChange('ifaGirls', e.target.value)} />
                                        </div>
                                    </fieldset>
                                    <fieldset className="border border-amber-300/50 dark:border-gray-600 rounded-lg p-3">
                                        <legend className="text-sm font-medium text-amber-700 dark:text-amber-400 px-1">RBSK Team</legend>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input label="Screened by RBSK" id="rbsk-screened" type="number" value={settings.healthStatus.screenedByRBSK} onChange={e => handleHealthChange('screenedByRBSK', e.target.value)} />
                                            <Input label="Referred by RBSK" id="rbsk-referred" type="number" value={settings.healthStatus.referredByRBSK} onChange={e => handleHealthChange('referredByRBSK', e.target.value)} />
                                        </div>
                                    </fieldset>
                                    
                                    <div className="flex items-center justify-between p-3 bg-amber-100/50 dark:bg-gray-800/50 rounded-lg">
                                        <label className="font-medium text-stone-700 dark:text-gray-300">Inspection Done This Month?</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={settings.inspectionReport.inspected} onChange={e => handleInspectionChange('inspected', e.target.checked)} />
                                            <div className="w-11 h-6 bg-stone-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                        </label>
                                    </div>
                                    <Input label="Number of Untoward Incidents" id="incidents" type="number" value={settings.inspectionReport.incidentsCount} onChange={e => handleInspectionChange('incidentsCount', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </AccordionItem>
                </Accordion>
            </div>
            <div className="fixed bottom-20 left-0 right-0 z-20 max-w-2xl mx-auto">
                 <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-2 border-t border-amber-200/50 dark:border-white/20">
                     <Button onClick={handleSave} className="w-full">
                         Save All Settings
                     </Button>
                 </div>
            </div>
        </div>
    );
};

export default SettingsPage;