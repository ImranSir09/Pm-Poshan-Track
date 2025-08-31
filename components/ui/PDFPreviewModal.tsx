import React from 'react';
import Button from './Button';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfDataUri: string;
    filename: string;
}

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ isOpen, onClose, pdfDataUri, filename }) => {
    if (!isOpen) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = pdfDataUri;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm p-2 sm:p-4">
            <div className="flex-shrink-0 flex items-center justify-between pb-2 sm:pb-4">
                <h3 className="text-md sm:text-lg font-bold text-cyan-300 truncate pr-2">{filename}</h3>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleDownload}>
                        Download
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
            <div className="flex-grow bg-gray-700 rounded-lg overflow-hidden">
                <iframe
                    src={pdfDataUri}
                    title="PDF Preview"
                    className="w-full h-full border-0"
                />
            </div>
        </div>
    );
};

export default PDFPreviewModal;
