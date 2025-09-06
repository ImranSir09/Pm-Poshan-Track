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
        if (!pdfBlob) {
            // Fallback for safety, using the provided URL
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }
        // Preferred method: create a temporary URL from the blob for downloading
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up the temporary URL
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
            <div className="flex-shrink-0 flex items-center justify-between pb-2 sm:pb-4">
                <h3 id="pdf-preview-title" className="text-md sm:text-lg font-bold text-amber-300 truncate pr-2">{filename}</h3>
                <div className="flex items-center space-x-2">
                    <Button variant="secondary" onClick={onRegenerate}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm10 8a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 111.885-.666A5.002 5.002 0 0014.001 13H11a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        Regenerate
                    </Button>
                    <Button onClick={handleDownload}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download
                    </Button>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Close PDF Preview">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="flex-grow bg-gray-700 rounded-lg overflow-hidden">
                <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full h-full"
                    aria-label="PDF Preview"
                >
                    <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                        <p className="mb-4 text-lg">PDF preview is not available in your browser.</p>
                        <p className="text-sm mb-4">Please download the file to view it.</p>
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
