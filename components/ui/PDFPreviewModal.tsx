import React from 'react';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    pdfBlob: Blob | null;
    filename: string;
}

// This component is currently not used in the application's report generation flow.
// Its functionality has been removed to ensure direct PDF downloads and to eliminate 
// potential deployment issues related to the PDF object embedder.
const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ isOpen }) => {
    if (!isOpen) {
        return null;
    }

    // The UI has been removed to prevent rendering and remove the <object> tag from the codebase.
    return null;
};

export default PDFPreviewModal;