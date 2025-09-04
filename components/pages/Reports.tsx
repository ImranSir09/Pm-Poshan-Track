import React, { useRef, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Modal from '../ui/Modal';
import { AppData } from '../../types';
import PDFPreviewModal from '../ui/PDFPreviewModal';
import { generatePDFReport } from '../../hooks/pdfGenerator';

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
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pdfPreviewData, setPdfPreviewData] = useState<{ blobUrl: string; pdfBlob: Blob; filename: string } | null>(null);

    const handleReportExport = () => {
        setIsGenerating(true);
        // Use a timeout to allow the UI to update before the main thread is blocked by PDF generation
        setTimeout(() => {
            try {
                // Revoke previous blob URL if it exists to avoid memory leaks
                if (pdfPreviewData?.blobUrl) {
                    URL.revokeObjectURL(pdfPreviewData.blobUrl);
                }
                const result = generatePDFReport(reportType, data, selectedMonth);
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
            const schoolName = data.settings.schoolDetails.name.replace(/\s+/g, '_');
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;
            a.download = `PM_POSHAN_Backup_${schoolName}_${dateString}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Data exported successfully!', 'success');
            updateLastBackupDate();
        } catch (error) {
            showToast('Error exporting data.', 'error');
            console.error(error);
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
                const parsedData = JSON.parse(text) as AppData;
                importData(parsedData);
            } catch (error) {
                showToast('Failed to import data. Invalid file format.', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    const handleReset = () => {
        resetData();
        setResetModalOpen(false);
        showToast('All application data has been reset.', 'success');
    };

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
                            </select>
                        </div>
                        {reportType !== 'roll_statement' && (
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
                        <Button onClick={handleReportExport} className="w-full" disabled={isGenerating}>
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
                            <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">Save all your app data (settings, entries, receipts) to a JSON file on your device.</p>
                            <Button onClick={handleExport} className="w-full">Export to JSON</Button>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-1">Import Data</p>
                            <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">Load data from a previously exported JSON file. This will overwrite current data.</p>
                            <Button onClick={handleImportClick} variant="secondary" className="w-full">Import from JSON</Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        </div>
                    </div>
                </Card>

                <Card title="Reset Application">
                    <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">This will permanently delete all entries, receipts, and settings, resetting the app to its initial state. Use with caution.</p>
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