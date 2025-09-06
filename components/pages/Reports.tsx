import React, { useRef, useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Modal from '../ui/Modal';
import { AppData, Category } from '../../types';
import PDFPreviewModal from '../ui/PDFPreviewModal';
import { generatePDFReport } from '../../hooks/pdfGenerator';
import { validateImportData } from '../../services/dataValidator';
import { calculateMonthlySummary } from '../../services/summaryCalculator';

const reportDescriptions: Record<string, string> = {
    mdcf: "Generates the official Monthly Data Collection Format (MDCF) required for reporting.",
    roll_statement: "Creates a summary of student enrollment numbers by class and social category.",
    daily_consumption: "Produces a detailed, register-style log of daily meals, attendance, and expenditure for the selected month.",
    rice_requirement: "Generates a formal certificate for the monthly rice requirement based on enrollment and working days.",
    yearly_consumption_detailed: "A comprehensive yearly report with category-wise monthly breakdowns of consumption, stock, and funds."
};

const Reports: React.FC = () => {
    const { data, importData, resetData, updateLastBackupDate } = useData();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isResetModalOpen, setResetModalOpen] = useState(false);
    const [reportType, setReportType] = useState('mdcf');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });
    
    // Logic for financial year selection
    const financialYearOptions = useMemo(() => {
        const currentMonth = new Date().getMonth(); // 0-11
        const currentYear = new Date().getFullYear();
        // If it's Jan, Feb, March, the current financial year is still the previous one.
        const endYear = currentMonth < 3 ? currentYear : currentYear + 1;
        const options = [];
        for (let i = 0; i < 5; i++) {
            const year = endYear - i;
            options.push(`${year - 1}-${year}`); // e.g. 2023-2024
        }
        return options;
    }, []);
    const [selectedFinancialYear, setSelectedFinancialYear] = useState(financialYearOptions[0]);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pdfPreviewData, setPdfPreviewData] = useState<{ blobUrl: string; pdfBlob: Blob; filename: string } | null>(null);
    const [importConfirmation, setImportConfirmation] = useState<{ data: AppData; summary: Record<string, string | number> } | null>(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [reportSummary, setReportSummary] = useState<Record<string, string | number> | null>(null);

    const initiateReportGeneration = () => {
        const summary = calculateMonthlySummary(data, selectedMonth);
        const { totals, closingBalance, monthEntries } = summary;
        
        let newSummary: Record<string, string | number> = {};
        
        const monthDate = new Date(`${selectedMonth}-02T00:00:00`);
        const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        switch (reportType) {
            case 'mdcf':
                newSummary = {
                    'Report': 'Monthly Data Collection Format (MDCF)',
                    'For Month': monthName,
                    'Total Meal Days': monthEntries.filter(e => e.totalPresent > 0).length,
                    'Total Students Fed': totals.present,
                    'Rice Consumed': `${totals.rice.toFixed(3)} kg`,
                    'Cooking Cost': `₹${totals.expenditure.toFixed(2)}`,
                    'Closing Rice': `${(closingBalance.rice.balvatika + closingBalance.rice.primary + closingBalance.rice.middle).toFixed(3)} kg`,
                    'Closing Cash': `₹${(closingBalance.cash.balvatika + closingBalance.cash.primary + closingBalance.cash.middle).toFixed(2)}`,
                };
                break;
            case 'daily_consumption':
                 newSummary = {
                    'Report': 'Daily Consumption Register',
                    'For Month': monthName,
                    'Total Meal Days': monthEntries.filter(e => e.totalPresent > 0).length,
                    'Rice Consumed': `${totals.rice.toFixed(3)} kg`,
                    'Total Expenditure': `₹${totals.expenditure.toFixed(2)}`,
                };
                break;
            case 'roll_statement':
                const totalEnrollment = data.settings.classRolls.reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);
                newSummary = {
                    'Report': 'Roll Statement',
                    'Total Enrollment': totalEnrollment,
                };
                break;
            case 'rice_requirement':
                 const workingDays = monthEntries.filter(e => e.totalPresent > 0).length;
                 const enrollment = data.settings.classRolls.reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);
                 const totalRiceKg = data.settings.classRolls.reduce((total, c) => {
                     let cat: Category | null = null;
                     if (['bal', 'pp1', 'pp2'].includes(c.id)) cat = 'balvatika';
                     else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) cat = 'primary';
                     else if (['c6', 'c7', 'c8'].includes(c.id)) cat = 'middle';

                     if (cat) {
                         const classRoll = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
                         total += (classRoll * workingDays * data.settings.rates.rice[cat]) / 1000;
                     }
                     return total;
                 }, 0);
                newSummary = {
                    'Report': 'Rice Requirement Certificate',
                    'For Month': monthName,
                    'Total Enrollment': enrollment,
                    'Working Days': workingDays,
                    'Total Rice Required': `${totalRiceKg.toFixed(3)} kg`,
                };
                break;
            case 'yearly_consumption_detailed':
                newSummary = {
                    'Report': 'Detailed Yearly Consumption Report',
                    'For Financial Year': selectedFinancialYear,
                    'Note': 'This report shows category-wise details for each month and may take time to generate.'
                };
                break;
        }

        setReportSummary(newSummary);
        setIsConfirmModalOpen(true);
    };

    const handleReportExport = () => {
        setIsGenerating(true);
        // Use a timeout to allow the UI to update before the main thread is blocked by PDF generation
        setTimeout(() => {
            try {
                // Revoke previous blob URL if it exists to avoid memory leaks
                if (pdfPreviewData?.blobUrl) {
                    URL.revokeObjectURL(pdfPreviewData.blobUrl);
                }
                const result = generatePDFReport(reportType, data, ['yearly_consumption_detailed'].includes(reportType) ? selectedFinancialYear : selectedMonth);
                const blobUrl = URL.createObjectURL(result.pdfBlob);
                setPdfPreviewData({ 
                    blobUrl, 
                    pdfBlob: result.pdfBlob, 
                    filename: result.filename 
                });
                if (!isPreviewOpen) {
                    setIsPreviewOpen(true);
                }
                showToast('Report generated successfully!', 'success');
            } catch (error: any) {
                console.error("PDF generation failed:", error);
                showToast(error.message || 'Failed to generate PDF report.', 'error');
            } finally {
                setIsGenerating(false);
            }
        }, 50);
    };

    const handleClosePreview = () => {
        if (pdfPreviewData?.blobUrl) {
            URL.revokeObjectURL(pdfPreviewData.blobUrl);
        }
        setIsPreviewOpen(false);
        setPdfPreviewData(null);
    };

    const handleExport = () => {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const schoolName = (data.settings.schoolDetails.name || 'School').replace(/[\\/:"*?<>|.\s]+/g, '_');
            
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;
            
            a.download = `PM_POSHAN_Backup_${schoolName}_${dateString}.json`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            showToast('Data exported successfully!', 'success');
            updateLastBackupDate();
        } catch (error) {
            showToast('Error exporting data. Check browser permissions or try again.', 'error');
            console.error("Data export failed:", error);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('Invalid file content');
                const parsedData = JSON.parse(text);
                
                const { isValid, errors, summary } = validateImportData(parsedData);

                if (!isValid) {
                    errors.forEach(err => showToast(err, 'error'));
                    showToast('Import failed. The file is invalid or corrupted.', 'error');
                    return;
                }
                
                setImportConfirmation({ data: parsedData as AppData, summary });

            } catch (error) {
                showToast('Failed to read or parse the file. It may be corrupted.', 'error');
                console.error(error);
            }
        };

        reader.onerror = (e) => {
            console.error("FileReader error:", e);
            showToast('Could not read the file. It may be corrupted or your browser is preventing access.', 'error');
        };

        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };
    
    const handleConfirmImport = () => {
        if (importConfirmation) {
            importData(importConfirmation.data);
            setImportConfirmation(null);
        }
    };

    const handleReset = () => {
        resetData();
        setResetModalOpen(false);
        showToast('All application data has been reset.', 'success');
    };
    
    const needsMonth = !['roll_statement', 'yearly_consumption_detailed'].includes(reportType);
    const needsYear = ['yearly_consumption_detailed'].includes(reportType);

    return (
        <>
            <PDFPreviewModal
                isOpen={isPreviewOpen}
                onClose={handleClosePreview}
                pdfUrl={pdfPreviewData?.blobUrl || ''}
                pdfBlob={pdfPreviewData?.pdfBlob || null}
                filename={pdfPreviewData?.filename || 'report.pdf'}
                onRegenerate={handleReportExport}
            />
            <Modal isOpen={isResetModalOpen} onClose={() => setResetModalOpen(false)} title="Confirm Reset">
                <p className="text-sm text-stone-600 dark:text-gray-300 mb-4">Are you sure you want to delete ALL data? This action cannot be undone. It is highly recommended to export your data first.</p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setResetModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReset}>Yes, Reset Data</Button>
                </div>
            </Modal>
            
            <Modal isOpen={!!importConfirmation} onClose={() => setImportConfirmation(null)} title="Confirm Data Import">
                <div className="space-y-4">
                    <p className="text-sm text-stone-600 dark:text-gray-300">
                        Please review the details from the file before importing.
                        <strong className="block mt-1 text-yellow-600 dark:text-yellow-400">Warning: This will overwrite all current application data.</strong>
                    </p>
                    <div className="text-sm space-y-2 bg-amber-100/40 dark:bg-gray-800/50 p-3 rounded-lg">
                        <p><strong>School Name:</strong> {importConfirmation?.summary.schoolName}</p>
                        <p><strong>UDISE:</strong> {importConfirmation?.summary.udise}</p>
                        <p><strong>Daily Entries Found:</strong> {importConfirmation?.summary.entryCount}</p>
                        <p><strong>Receipts Found:</strong> {importConfirmation?.summary.receiptCount}</p>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setImportConfirmation(null)}>Cancel</Button>
                        <Button variant="danger" onClick={handleConfirmImport}>Confirm & Overwrite</Button>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Report Generation">
                <div className="space-y-4">
                    <p className="text-sm text-stone-600 dark:text-gray-300">
                        Please review the summary below before generating the PDF. Does this look correct?
                    </p>
                    {reportSummary && (
                        <div className="text-sm space-y-2 bg-amber-100/40 dark:bg-gray-800/50 p-3 rounded-lg">
                            {Object.entries(reportSummary).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                    <strong className="text-stone-700 dark:text-gray-300 pr-2">{key}:</strong>
                                    <span className="text-stone-900 dark:text-white text-right">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => {
                            setIsConfirmModalOpen(false);
                            handleReportExport();
                        }}>
                            Generate PDF
                        </Button>
                    </div>
                </div>
            </Modal>
        
            <div className="space-y-4">
                <Card title="Export Reports">
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="report-type" className="block text-xs font-medium mb-1 text-stone-600 dark:text-gray-300">Report Type</label>
                            <select 
                                id="report-type" 
                                value={reportType} 
                                onChange={e => setReportType(e.target.value)} 
                                className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                            >
                                <option value="mdcf">Monthly Data Collection Format (MDCF)</option>
                                <option value="roll_statement">Roll Statement</option>
                                <option value="daily_consumption">Daily Consumption Register</option>
                                <option value="rice_requirement">Rice Requirement Certificate</option>
                                <option value="yearly_consumption_detailed">Yearly Consumption Report (Detailed)</option>
                            </select>
                            <p className="mt-1 text-xs text-stone-500 dark:text-gray-400">{reportDescriptions[reportType]}</p>
                        </div>
                        {needsMonth && (
                            <div>
                                <label htmlFor="month-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Select Month</label>
                                <input
                                    id="month-select"
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                        )}
                         {needsYear && (
                             <div>
                                <label htmlFor="year-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Select Financial Year</label>
                                <select
                                    id="year-select"
                                    value={selectedFinancialYear}
                                    onChange={(e) => setSelectedFinancialYear(e.target.value)}
                                    className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                                >
                                    {financialYearOptions.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <Button onClick={initiateReportGeneration} className="w-full" disabled={isGenerating}>
                            {isGenerating ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </span>
                            ) : (
                                'Generate & Preview PDF'
                            )}
                        </Button>
                    </div>
                </Card>

                <Card title="Data Backup & Restore">
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm font-medium mb-1">Export Data</p>
                            <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">
                                Save all app data to a file. <strong>This is your only backup.</strong> Store it in a safe place (e.g., email, cloud drive) to prevent data loss.
                            </p>
                            <Button onClick={handleExport} className="w-full">Export to JSON</Button>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-1">Import Data</p>
                            <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">
                                Restore data from a backup file. <span className="font-bold text-yellow-600 dark:text-yellow-400">Warning: This will replace all existing data in the app.</span>
                            </p>
                            <Button onClick={handleImportClick} variant="secondary" className="w-full">Select File to Import</Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        </div>
                    </div>
                </Card>

                <Card title="Reset Application">
                    <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">
                        <span className="font-bold text-red-600 dark:text-red-400">This action is irreversible.</span> It will permanently delete all data. Ensure you have a backup if you wish to restore later.
                    </p>
                    <Button onClick={() => setResetModalOpen(true)} variant="danger" className="w-full">Reset All Data</Button>
                </Card>

                <Card title="Help & About">
                    <div className="space-y-4 text-sm text-stone-600 dark:text-gray-300">
                        <div>
                            <h3 className="font-semibold text-amber-700 dark:text-amber-400">App Guide</h3>
                            <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                                Here’s a quick guide to the app's functions:
                            </p>
                            <ul className="list-disc list-inside space-y-1 mt-2 text-xs">
                                <li><b>Dashboard:</b> Your daily hub. Add/edit today's meal entry and see a monthly overview at a glance.</li>
                                <li><b>Summary:</b> View detailed monthly breakdowns of consumption, expenditure, and stock balances.</li>
                                <li><b>Receipts:</b> Log all incoming rice and cash to keep your stock and fund records accurate.</li>
                                <li><b>Settings:</b> Crucial for accuracy! Configure your school details, student enrollment, and food rates here before you start.</li>
                                <li><b>Reports:</b> Generate PDF reports, back up your data to a file, or restore from a backup.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-amber-700 dark:text-amber-400">Feedback & Support</h3>
                            <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                                Have questions or suggestions? Your feedback is valuable! Please get in touch.
                            </p>
                        </div>
                        <div className="text-xs pt-2 border-t border-amber-200/50 dark:border-white/10">
                            <p><strong>App Version:</strong> 1.2.1</p>
                            <p><strong>Developer:</strong> Imran Gani Mugloo</p>
                            <p><strong>Contact:</strong> <a href="tel:+919149690096" className="text-amber-600 dark:text-amber-400 hover:underline">+91 9149690096</a></p>
                            <p><strong>Email:</strong> <a href="mailto:emraanmugloo123@gmail.com" className="text-amber-600 dark:text-amber-400 hover:underline">emraanmugloo123@gmail.com</a></p>
                            <p><strong>Website:</strong> <a href="https://imransir09.github.io/Pm-Poshan-Track/" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 hover:underline">Pm-Poshan-Track</a></p>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default Reports;