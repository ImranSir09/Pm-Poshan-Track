// FIX: The type definition for 'jspdf' is missing. Removing the problematic type reference and import,
// and defining a local interface for jsPDF. This allows the file to compile without
// relying on external type definitions that may not be available in the environment.
// /// <reference types="jspdf" />
// import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { AppData, Settings, Category, AbstractData } from '../types';
import { calculateMonthlySummary, getOpeningBalanceForMonth } from '../services/summaryCalculator';

// A local, partial interface for jsPDF to work around missing type definitions.
// It includes properties for jspdf-autotable.
interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
    [key: string]: any;
}

// Since jspdf is loaded from a CDN, it's available as a global
declare const jspdf: any;

const calculateCategoryAbstract = (data: AppData, selectedMonth: string, category: Category) => {
    const openingBalance = getOpeningBalanceForMonth(data, selectedMonth);

    const received = data.receipts
        .filter(r => r.date.startsWith(selectedMonth))
        .reduce((acc, r) => {
            acc.rice += r.rice[category];
            acc.cash += r.cash[category];
            return acc;
        }, { rice: 0, cash: 0 });
    
    const entries = data.entries.filter(e => e.date.startsWith(selectedMonth));
    const { rates } = data.settings;

    const consumption = entries.reduce((acc, entry) => {
        const present = entry.present[category];
        acc.rice += (present * rates.rice[category]) / 1000;
        acc.cash += present * (rates.dalVeg[category] + rates.oilCond[category] + rates.salt[category] + rates.fuel[category]);
        return acc;
    }, { rice: 0, cash: 0 });

    const riceAbstract = {
        opening: openingBalance.rice[category],
        received: received.rice,
        total: openingBalance.rice[category] + received.rice,
        consumed: consumption.rice,
        closing: openingBalance.rice[category] + received.rice - consumption.rice,
    };

    const cashAbstract = {
        opening: openingBalance.cash[category],
        received: received.cash,
        total: openingBalance.cash[category] + received.cash,
        expenditure: consumption.cash,
        closing: openingBalance.cash[category] + received.cash - consumption.cash,
    };
    
    return { riceAbstract, cashAbstract };
};

const generateDailyConsumptionReport = (data: AppData, month: string) => {
    const doc = new jspdf.jsPDF() as jsPDF;
    const { settings, entries } = data;
    const { schoolDetails } = settings;

    const monthDate = new Date(`${month}-02T00:00:00`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();
    const daysInMonth = new Date(year, monthDate.getMonth() + 1, 0).getDate();

    const categoriesInfo = [
        { key: 'balvatika' as Category, name: 'Pre-Primary' },
        { key: 'primary' as Category, name: 'Primary' },
        { key: 'middle' as Category, name: 'Upper-Primary' }
    ];

    let firstPage = true;

    for (const categoryInfo of categoriesInfo) {
        const { key: category, name: departmentName } = categoryInfo;
        
        const onRoll = (settings.classRolls || []).reduce((total, c) => {
            const classTotal = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
            if (category === 'balvatika' && ['bal', 'pp1', 'pp2'].includes(c.id)) return total + classTotal;
            if (category === 'primary' && ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) return total + classTotal;
            if (category === 'middle' && ['c6', 'c7', 'c8'].includes(c.id)) return total + classTotal;
            return total;
        }, 0);

        if (onRoll === 0) continue;

        if (!firstPage) {
            doc.addPage();
        }
        firstPage = false;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
        doc.setFontSize(12);
        doc.text('Daily Consumption Register of Mid-day Meals', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Month: ${monthName}`, 14, 25);
        doc.text(`Year: ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
        doc.text(`Department: ${departmentName}`, doc.internal.pageSize.getWidth() - 14, 25, { align: 'right' });
        
        const head1 = ['S.No', 'Date', 'Roll', 'Present', 'FG Srv', 'FG Used', 'Dal Veg', 'Salt Cond', 'Fat Oil', 'Fuel', 'Total', 'Sign'];
        const ratesTotalCost = settings.rates.dalVeg[category] + settings.rates.salt[category] + settings.rates.oilCond[category] + settings.rates.fuel[category];
        const head2 = [
            { content: 'Rates/Student →', colSpan: 5, styles: { halign: 'right', fontStyle: 'italic', fontSize: 7 } },
            `@ ${(settings.rates.rice[category]/1000).toFixed(3)}kg`,
            `@₹${settings.rates.dalVeg[category].toFixed(2)}`,
            `@₹${settings.rates.salt[category].toFixed(2)}`,
            `@₹${settings.rates.oilCond[category].toFixed(2)}`,
            `@₹${settings.rates.fuel[category].toFixed(2)}`,
            `@₹${ratesTotalCost.toFixed(2)}`,
            ''
        ];
        
        const body: any[] = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, monthDate.getMonth(), i);
            const dateString = date.toISOString().slice(0, 10);
            const formattedDate = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const dayOfWeek = date.getDay();
            
            const entry = entries.find(e => e.id === dateString);
            
            if (dayOfWeek === 0) {
                body.push([i, formattedDate, '', '', { content: 'sunday', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic' } }, '']);
            } else if (entry) {
                const present = entry.present[category];
                if (present > 0) {
                    const riceUsed = (present * settings.rates.rice[category]) / 1000;
                    const dalVegCost = present * settings.rates.dalVeg[category];
                    const saltCost = present * settings.rates.salt[category];
                    const oilCost = present * settings.rates.oilCond[category];
                    const fuelCost = present * settings.rates.fuel[category];
                    const totalCost = dalVegCost + saltCost + oilCost + fuelCost;
                    body.push([i, formattedDate, onRoll, present, 'Rice', riceUsed.toFixed(3), dalVegCost.toFixed(2), saltCost.toFixed(2), oilCost.toFixed(2), fuelCost.toFixed(2), totalCost.toFixed(2), '']);
                } else {
                    const reason = entry.reasonForNoMeal || 'No Meal Served';
                    body.push([i, formattedDate, onRoll, 0, { content: reason, colSpan: 7, styles: { halign: 'center', fontStyle: 'italic', fontSize: 8 } }, '']);
                }
            } else {
                body.push([i, formattedDate, onRoll, 0, '', '0.000', '0.00', '0.00', '0.00', '0.00', '0.00', '']);
            }
        }

        doc.autoTable({
            head: [head1, head2],
            body: body,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1, halign: 'center', valign: 'middle' },
            headStyles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 20 },
            columnStyles: { 1: { halign: 'left' }, 4: { halign: 'left' } },
        });
        
        const { riceAbstract, cashAbstract } = calculateCategoryAbstract(data, month, category);
        const finalY = doc.lastAutoTable.finalY;

        doc.autoTable({
            body: [
                [{ content: 'Abstract of Rice', styles: { fontStyle: 'bold' } }],
                ['1. Opening Balance:-', { content: `${riceAbstract.opening.toFixed(3)} Kg`, styles: { halign: 'right' } }],
                ['2. Quantity received:-', { content: `${riceAbstract.received.toFixed(3)} Kg`, styles: { halign: 'right' } }],
                ['3. Total Quantity:-', { content: `${riceAbstract.total.toFixed(3)} Kg`, styles: { halign: 'right' } }],
                ['4. Rice Consumed:-', { content: `${riceAbstract.consumed.toFixed(3)} Kg`, styles: { halign: 'right' } }],
                ['5. Closing Balance:-', { content: `${riceAbstract.closing.toFixed(3)} Kg`, styles: { halign: 'right' } }],
            ],
            startY: finalY + 4,
            theme: 'grid',
            tableWidth: 95,
            styles: { fontSize: 9, cellPadding: 1.5 },
        });
        
        doc.autoTable({
            body: [
                [{ content: 'Abstract of Cash', styles: { fontStyle: 'bold' } }],
                ['1. Opening Balance:-', { content: `₹ ${cashAbstract.opening.toFixed(2)}`, styles: { halign: 'right' } }],
                ['2. Amount received:-', { content: `₹ ${cashAbstract.received.toFixed(2)}`, styles: { halign: 'right' } }],
                ['3. Total Amount:-', { content: `₹ ${cashAbstract.total.toFixed(2)}`, styles: { halign: 'right' } }],
                ['4. Expenditure:-', { content: `₹ ${cashAbstract.expenditure.toFixed(2)}`, styles: { halign: 'right' } }],
                ['5. closing balance', { content: `₹ ${cashAbstract.closing.toFixed(2)}`, styles: { halign: 'right' } }],
            ],
            startY: finalY + 4,
            theme: 'grid',
            tableWidth: 95,
            margin: { left: 105 },
            styles: { fontSize: 9, cellPadding: 1.5 },
        });

        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.text('- Report generated on PM POSHAN Tracker -', doc.internal.pageSize.getWidth() / 2, pageHeight - 8, { align: 'center' });
    }

    const filename = `Daily_Consumption_${schoolDetails.name.replace(/\s/g, '_')}_${month}.pdf`;
    const dataUri = doc.output('datauristring');
    return { dataUri, filename };
};

const generateRollStatementPDF = (settings: Settings) => {
    const doc = new jspdf.jsPDF() as jsPDF;
    const { schoolDetails, classRolls } = settings;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Main Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Office of the Headmaster ${schoolDetails.name}`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const currentYear = new Date().getFullYear();
    doc.text(`Roll Statement for session ${currentYear}-${currentYear + 1}`, pageWidth / 2, 22, { align: 'center' });

    const head: any[] = [
        [
            { content: 'S. No.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Class', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'General', colSpan: 2, styles: { halign: 'center' } },
            { content: 'ST/SC', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Total', colSpan: 2, styles: { halign: 'center' } },
            { content: 'On Roll', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        ],
        [
            'Boys', 'Girls', // General
            'Boys', 'Girls', // ST/SC
            'Boys', 'Girls', // Total
        ]
    ];
    
    const body: any[] = [];
    let serial = 1;

    const middleClasses = classRolls.filter(c => ['c6','c7','c8'].includes(c.id)).sort((a,b) => b.name.localeCompare(a.name));
    const primaryClasses = classRolls.filter(c => ['c1','c2','c3','c4','c5'].includes(c.id)).sort((a,b) => b.name.localeCompare(a.name));
    const prePrimaryClasses = classRolls.filter(c => ['bal','pp1','pp2'].includes(c.id)).sort((a,b) => b.name.localeCompare(a.name));
    
    const calculateSectionTotals = (classes: any[]) => {
        return classes.reduce((acc, cr) => {
            acc.gen_b += cr.general.boys; acc.gen_g += cr.general.girls;
            acc.stsc_b += cr.stsc.boys; acc.stsc_g += cr.stsc.girls;
            return acc;
        }, { gen_b: 0, gen_g: 0, stsc_b: 0, stsc_g: 0 });
    };

    const addSection = (title: string, classes: any[]) => {
        if (classes.length === 0) return;

        body.push([{ content: title, colSpan: 9, styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0, halign: 'left' } }]);
        
        classes.forEach(cr => {
            const totalBoys = cr.general.boys + cr.stsc.boys;
            const totalGirls = cr.general.girls + cr.stsc.girls;
            body.push([
                serial++, cr.name,
                cr.general.boys, cr.general.girls,
                cr.stsc.boys, cr.stsc.girls,
                totalBoys, totalGirls,
                totalBoys + totalGirls,
            ]);
        });

        const totals = calculateSectionTotals(classes);
        const totalBoys = totals.gen_b + totals.stsc_b;
        const totalGirls = totals.gen_g + totals.stsc_g;
        body.push([
            { content: `Total (${title.split(' ')[0]})`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
            totals.gen_b, totals.gen_g, totals.stsc_b, totals.stsc_g,
            totalBoys, totalGirls, totalBoys + totalGirls,
        ]);
    };

    addSection('Middle Section (VI-VIII)', middleClasses);
    addSection('Primary Section (I-V)', primaryClasses);
    addSection('Pre-Primary Section', prePrimaryClasses);

    const grandTotal = calculateSectionTotals(classRolls);
    const grandTotalBoys = grandTotal.gen_b + grandTotal.stsc_b;
    const grandTotalGirls = grandTotal.gen_g + grandTotal.stsc_g;
    const grandOnRoll = grandTotalBoys + grandTotalGirls;

    doc.autoTable({
        startY: 28,
        head: head,
        body: body,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2, halign: 'center' },
        headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold' },
        didParseCell: (data: any) => {
             if (data.cell.raw.content?.toString().startsWith('Total')) {
                data.cell.styles.fillColor = [240, 240, 240];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        foot: [[
            { content: 'Grand Total', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
            grandTotal.gen_b, grandTotal.gen_g,
            grandTotal.stsc_b, grandTotal.stsc_g,
            grandTotalBoys, grandTotalGirls,
            grandOnRoll
        ]],
        footStyles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 20 }
    });

    const filename = `Roll_Statement_${settings.schoolDetails.name.replace(/\s/g, '_')}.pdf`;
    const dataUri = doc.output('datauristring');
    return { dataUri, filename };
};


const generateMDCFReport = (data: AppData, selectedMonth: string) => {
    const { settings } = data;
    const { monthEntries, riceAbstracts, cashAbstracts, categoryTotals } = calculateMonthlySummary(data, selectedMonth);
    
    if (monthEntries.length === 0) {
        throw new Error('No data available for the selected month to generate MDCF report.');
    }
    
    const doc = new jspdf.jsPDF() as jsPDF;
    const { schoolDetails, cooks, healthStatus, inspectionReport } = settings;
    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    let finalY = 0;
    let startY;
    const pageMargin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    const addSectionTitle = (title: string, y: number) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageMargin, y);
        return y + 3;
    };
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PM-POSHAN (Mid-Day Meal Scheme)', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Monthly Data Collection Format (MDCF)', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`School: ${schoolDetails.name}`, pageMargin, 25);
    doc.text(`UDISE: ${schoolDetails.udise}`, pageWidth / 2, 25, { align: 'center' });
    doc.text(`Month: ${monthName} ${year}`, pageWidth - pageMargin, 25, { align: 'right' });

    doc.autoTable({
        startY: 28,
        theme: 'grid',
        body: [
            ['School Type', schoolDetails.type, 'School Category', schoolDetails.category],
            ['Kitchen Type', schoolDetails.kitchenType, 'State/UT', schoolDetails.state],
            ['District', schoolDetails.district, 'Block/NP', schoolDetails.block],
            ['Village/Ward', schoolDetails.village, '', ''],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
    });
    finalY = doc.lastAutoTable.finalY;

    startY = addSectionTitle('2. Meals Availed Status', finalY + 8);
    doc.autoTable({
        startY,
        theme: 'grid',
        head: [['Category', 'School Days', 'MDM Days', 'Total Meals']],
        body: [
            ['Balvatika', monthEntries.length, monthEntries.length, categoryTotals.present.balvatika],
            ['Primary', monthEntries.length, monthEntries.length, categoryTotals.present.primary],
            ['Middle', monthEntries.length, monthEntries.length, categoryTotals.present.middle],
        ],
        styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
    });
    finalY = doc.lastAutoTable.finalY;

    startY = addSectionTitle('3. Fund Details (in Rs.)', finalY + 8);
    doc.autoTable({
        startY,
        head: [['Category', 'Opening', 'Received', 'Expenditure', 'Closing']],
        body: [
            ['Balvatika', cashAbstracts.balvatika.opening.toFixed(2), cashAbstracts.balvatika.received.toFixed(2), cashAbstracts.balvatika.expenditure?.toFixed(2), cashAbstracts.balvatika.balance.toFixed(2)],
            ['Primary', cashAbstracts.primary.opening.toFixed(2), cashAbstracts.primary.received.toFixed(2), cashAbstracts.primary.expenditure?.toFixed(2), cashAbstracts.primary.balance.toFixed(2)],
            ['Middle', cashAbstracts.middle.opening.toFixed(2), cashAbstracts.middle.received.toFixed(2), cashAbstracts.middle.expenditure?.toFixed(2), cashAbstracts.middle.balance.toFixed(2)],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, halign: 'right' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
        columnStyles: { 0: { halign: 'left' }}
    });
    finalY = doc.lastAutoTable.finalY;
    
    startY = addSectionTitle('4. Cook Cum Helper Payment Details', finalY + 8);
    const cookBody = cooks.length > 0
        ? cooks.map(cook => [cook.name, cook.gender, cook.category, cook.paymentMode, cook.amountPaid.toFixed(2)])
        : [[{ content: 'No cook data entered in settings.', colSpan: 5, styles: { halign: 'center' } }]];
    doc.autoTable({
        startY,
        head: [['Name', 'Gender', 'Category', 'Payment Mode', 'Amount (Rs.)']],
        body: cookBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
    });
    finalY = doc.lastAutoTable.finalY;
    
    if (finalY > 250) { doc.addPage(); finalY = 15; }

    startY = addSectionTitle('5. Food Grains Details (in Kg.)', finalY + 8);
    doc.autoTable({
        startY,
        head: [['Category', 'Opening', 'Received', 'Consumed', 'Closing']],
        body: [
            ['Balvatika (Rice)', riceAbstracts.balvatika.opening.toFixed(3), riceAbstracts.balvatika.received.toFixed(3), riceAbstracts.balvatika.consumed?.toFixed(3), riceAbstracts.balvatika.balance.toFixed(3)],
            ['Primary (Rice)', riceAbstracts.primary.opening.toFixed(3), riceAbstracts.primary.received.toFixed(3), riceAbstracts.primary.consumed?.toFixed(3), riceAbstracts.primary.balance.toFixed(3)],
            ['Middle (Rice)', riceAbstracts.middle.opening.toFixed(3), riceAbstracts.middle.received.toFixed(3), riceAbstracts.middle.consumed?.toFixed(3), riceAbstracts.middle.balance.toFixed(3)],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, halign: 'right' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
        columnStyles: { 0: { halign: 'left' }}
    });
    finalY = doc.lastAutoTable.finalY;
    
    startY = addSectionTitle('6. Children Health Status', finalY + 8);
    doc.autoTable({
        startY,
        head: [['Particulars', 'Count']],
        body: [
            ['IFA Tablets - Boys', healthStatus.ifaBoys],
            ['IFA Tablets - Girls', healthStatus.ifaGirls],
            ['Screened by RBSK Team', healthStatus.screenedByRBSK],
            ['Referred by RBSK Team', healthStatus.referredByRBSK],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
        columnStyles: { 1: { halign: 'center' }}
    });
    finalY = doc.lastAutoTable.finalY;

    startY = addSectionTitle('7. Inspection Report', finalY + 8);
    doc.autoTable({
        startY,
        head: [['Particulars', 'Status/Count']],
        body: [
            ['Inspection Done This Month', inspectionReport.inspected ? 'Yes' : 'No'],
            ['Number of Untoward Incidents', inspectionReport.incidentsCount],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
        columnStyles: { 1: { halign: 'center' }}
    });
    finalY = doc.lastAutoTable.finalY;

    const signatureY = finalY > 260 ? 280 : finalY + 25;
    if (signatureY > 280) { doc.addPage(); finalY = 20; }
    doc.setFontSize(10);
    doc.text('____________________\nSignature of Sarpanch', pageMargin, signatureY);
    doc.text('____________________\nSignature of Headmaster/Principal', pageWidth - pageMargin, signatureY, { align: 'right' });

    const filename = `${settings.schoolDetails.name.replace(/\s/g, '_')}_MDCF_${selectedMonth}.pdf`;
    const dataUri = doc.output('datauristring');
    return { dataUri, filename };
};

export const generatePDFReport = (reportType: string, data: AppData, selectedMonth: string) => {
    switch (reportType) {
        case 'mdcf':
            return generateMDCFReport(data, selectedMonth);
        case 'roll_statement':
            return generateRollStatementPDF(data.settings);
        case 'daily_consumption':
             if (data.entries.filter((entry) => entry.date.startsWith(selectedMonth)).length === 0) {
                throw new Error('No data available for the selected month to generate the report.');
            }
            return generateDailyConsumptionReport(data, selectedMonth);
        default:
            throw new Error('Unknown report type');
    }
};
