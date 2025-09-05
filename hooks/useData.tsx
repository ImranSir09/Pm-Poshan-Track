import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppData, DailyEntry, Receipt, Settings, MonthlyBalanceData, MonthlyBalance, InspectionAuthority, AuthData } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import { showToast } from './useToast';

const APP_DATA_KEY = 'pmPoshanData_v2';

// Simple deep merge utility
const isObject = (item: any): boolean => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

const deepMerge = (target: any, source: any): any => {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = deepMerge(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
};


const getInitialData = (): AppData => {
    try {
        const savedData = localStorage.getItem(APP_DATA_KEY);
        if (savedData) {
            const parsedData = JSON.parse(savedData) as AppData;
            
            // Backward compatibility/migration for settings
            const mergedSettings = deepMerge(DEFAULT_SETTINGS, parsedData.settings);
            parsedData.settings = mergedSettings;

            if (!parsedData.auth) {
                parsedData.auth = { username: '', securityQuestion: '', securityAnswer: '' };
            }

            // MIGRATION: Convert old inspection report object to new string format
            if (parsedData.settings?.inspectionReport?.inspectedBy && isObject(parsedData.settings.inspectionReport.inspectedBy)) {
                const oldInspectedBy = parsedData.settings.inspectionReport.inspectedBy as any;
                let newInspectedBy: InspectionAuthority = '';
                if (oldInspectedBy.taskForce) newInspectedBy = 'Task Force';
                else if (oldInspectedBy.districtOfficials) newInspectedBy = 'District Officials';
                else if (oldInspectedBy.blockOfficials) newInspectedBy = 'Block Officials';
                else if (oldInspectedBy.smcMembers) newInspectedBy = 'SMC Members';
                parsedData.settings.inspectionReport.inspectedBy = newInspectedBy;
            }

            // MIGRATION: Convert old scalar receipts to new category-wise structure
            if (parsedData.receipts && parsedData.receipts.length > 0 && typeof (parsedData.receipts[0] as any).rice === 'number') {
                parsedData.receipts = parsedData.receipts.map((receipt: any) => ({
                    ...receipt,
                    rice: { balvatika: 0, primary: receipt.rice, middle: 0 },
                    cash: { balvatika: 0, primary: receipt.cash, middle: 0 },
                }));
            }

            // MIGRATION: Convert old scalar monthly balances to new category-wise structure
            if(parsedData.monthlyBalances) {
                const migratedBalances: MonthlyBalance = {};
                Object.keys(parsedData.monthlyBalances).forEach(key => {
                    const balance = (parsedData.monthlyBalances as any)[key];
                    if (balance && typeof balance.rice === 'number') {
                        migratedBalances[key] = {
                            rice: { balvatika: 0, primary: balance.rice, middle: 0 },
                            cash: { balvatika: 0, primary: balance.cash, middle: 0 },
                        };
                    } else {
                        migratedBalances[key] = balance;
                    }
                });
                parsedData.monthlyBalances = migratedBalances;
            }

            return parsedData;
        }
    } catch (error) {
        console.error("Failed to parse data from localStorage", error);
    }
    return {
        auth: { username: '', securityQuestion: '', securityAnswer: '' },
        settings: DEFAULT_SETTINGS,
        entries: [],
        receipts: [],
        monthlyBalances: {},
        lastBackupDate: undefined,
    };
};


interface DataContextType {
    data: AppData;
    setData: React.Dispatch<React.SetStateAction<AppData>>;
    addEntry: (entry: DailyEntry, overwrite?: boolean) => boolean;
    deleteEntry: (id: string) => void;
    addReceipt: (receipt: Omit<Receipt, 'id'>) => void;
    deleteReceipt: (id: string) => void;
    updateSettings: (settings: Settings) => void;
    saveMonthlyBalance: (monthKey: string, balance: MonthlyBalanceData) => void;
    importData: (importedData: AppData) => void;
    resetData: () => void;
    updateLastBackupDate: () => void;
    updateAuth: (authData: AuthData) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<AppData>(getInitialData);

    useEffect(() => {
        const handler = setTimeout(() => {
            try {
                // Persist the entire app state to localStorage.
                // This ensures that authentication state is preserved across reloads and after imports.
                localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
            } catch (error) {
                console.error("Failed to save data to localStorage", error);
                showToast("Could not save data. Storage may be full.", "error");
            }
        }, 500); // Debounce save operation by 500ms

        return () => {
            clearTimeout(handler);
        };
    }, [data]);

    const addEntry = useCallback((entry: DailyEntry, overwrite = false): boolean => {
        const existingIndex = data.entries.findIndex(e => e.id === entry.id);
        if (existingIndex !== -1 && !overwrite) {
            return false; // Indicates that overwrite confirmation is needed
        }
        
        setData(prevData => {
            const newEntries = [...prevData.entries];
            if (existingIndex !== -1) {
                newEntries[existingIndex] = entry;
            } else {
                newEntries.push(entry);
            }
            newEntries.sort((a, b) => a.date.localeCompare(b.date));
            return { ...prevData, entries: newEntries };
        });
        return true;
    }, [data.entries]);

    const deleteEntry = useCallback((id: string) => {
        setData(prevData => ({
            ...prevData,
            entries: prevData.entries.filter(e => e.id !== id)
        }));
    }, []);

    const addReceipt = useCallback((receipt: Omit<Receipt, 'id'>) => {
        setData(prevData => {
            const newReceipt: Receipt = { ...receipt, id: new Date().toISOString() };
            const newReceipts = [...prevData.receipts, newReceipt];
            newReceipts.sort((a, b) => a.date.localeCompare(b.date));
            return { ...prevData, receipts: newReceipts };
        });
    }, []);

    const deleteReceipt = useCallback((id: string) => {
        setData(prevData => ({
            ...prevData,
            receipts: prevData.receipts.filter(r => r.id !== id)
        }));
    }, []);

    const updateSettings = useCallback((settings: Settings) => {
        setData(prevData => ({ ...prevData, settings }));
    }, []);
    
    const updateAuth = useCallback((authData: AuthData) => {
        // Asynchronously update auth data; the useEffect will handle saving.
        setData(prevData => ({ ...prevData, auth: authData }));
    }, []);

    const saveMonthlyBalance = useCallback((monthKey: string, balance: MonthlyBalanceData) => {
        setData(prevData => ({
            ...prevData,
            monthlyBalances: {
                ...prevData.monthlyBalances,
                [monthKey]: balance,
            },
        }));
    }, []);
    
    const updateLastBackupDate = useCallback(() => {
        setData(prevData => ({ ...prevData, lastBackupDate: new Date().toISOString() }));
    }, []);

    const importData = useCallback((importedData: AppData) => {
        try {
            let finalData = importedData;
            // Preserve authentication if the imported file doesn't have it
            if (!importedData.auth?.password) {
                finalData = { ...importedData, auth: data.auth };
            }
            // Persist synchronously to guarantee it's saved before reload.
            localStorage.setItem(APP_DATA_KEY, JSON.stringify(finalData));
            
            // Also update the state for consistency before the reload.
            // This prevents a brief flash of old content if the component re-renders.
            setData(finalData);

            showToast('Data imported successfully! The app will now reload.', 'success');
            // Reload the application to apply the new state cleanly from storage.
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error("Failed to import data:", error);
            showToast("Failed to import data. The file may be corrupt or storage is full.", "error");
        }
    }, [data.auth, setData]);

    const resetData = useCallback(() => {
        // Clear storage synchronously.
        localStorage.removeItem(APP_DATA_KEY);
        sessionStorage.removeItem('pm-poshan-auth');
        
        // The parent component shows a toast. We delay reload to ensure it's visible.
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }, []);

    return (
        <DataContext.Provider value={{ data, setData, addEntry, deleteEntry, addReceipt, deleteReceipt, updateSettings, saveMonthlyBalance, importData, resetData, updateLastBackupDate, updateAuth }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};