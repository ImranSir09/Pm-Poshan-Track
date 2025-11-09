import React from 'react';
import Button from './Button';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    pdfBlob: Blob | null;
    filename: string;
    onRegenerate: () => void;
}

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ isOpen, onClose, pdfUrl, pdfBlob, filename, onRegenerate }) => {
    if (!isOpen) return null;

    const handleDownload = () => {
        // Prioritize using the raw blob for downloading as it's more direct and reliable.
        if (pdfBlob) {
            const downloadUrl = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
    
            // Use a timeout to ensure the browser has initiated the download
            // before the link is removed and the object URL is revoked.
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl);
            }, 100);
        } else {
            // Fallback to the provided URL if the blob isn't available.
            // This will work for data URIs but is less efficient.
            console.warn("PDF blob not available for download, falling back to URL.");
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900 text-white pdf-preview-container" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
            {/* Control Panel */}
            <header className="flex-shrink-0 w-full flex items-center justify-between p-2 sm:p-3 bg-slate-800/50 border-b border-slate-700 shadow-md pdf-preview-header">
                <div className="flex items-center space-x-2 truncate">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0" aria-label="Back to Reports">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <h3 id="pdf-preview-title" className="text-sm sm:text-base font-bold text-slate-200 truncate pr-2">{filename}</h3>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button variant="secondary" onClick={() => window.print()} className="!px-3 !py-1.5 text-xs sm:!text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 hidden sm:inline-block" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M5 4v3h10V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm-1 5a1 1 0 00-1 1v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-1-1H4z" clipRule="evenodd" />
                           <path d="M3 9a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                        </svg>
                        Print
                    </Button>
                    <Button onClick={handleDownload} className="!px-3 !py-1.5 text-xs sm:!text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 hidden sm:inline-block" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download PDF
                    </Button>
                </div>
            </header>
            
            <div className="flex-grow overflow-hidden pdf-preview-content-area">
                <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full h-full"
                    aria-label="PDF Preview"
                >
                    <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                        <p className="mb-4 text-lg">PDF preview is not available in your browser.</p>
                        <p className="text-sm mb-4">You can download the file to view it.</p>
                        <Button onClick={handleDownload}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Download PDF
                        </Button>
                    </div>
                </object>
            </div>
        </div>
    );
};

export default PDFPreviewModal;