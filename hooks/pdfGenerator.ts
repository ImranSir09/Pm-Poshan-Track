import { AppData, ClassRoll } from '../types';
import { calculateMonthlySummary } from '../services/summaryCalculator';
import { CLASS_STRUCTURE } from '../constants';


interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
    [key: string]: any;
}

declare const jspdf: any;

const generateMDCFReport = (data: AppData, month: string) => {
    const doc = new jspdf.jsPDF() as jsPDF;
    const { settings } = data;
    const { schoolDetails, mdmIncharge, healthStatus, inspectionReport } = settings;

    const monthDate = new Date(`${month}-02T00:00:00Z`);
    const monthName = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Monthly Data Cumulation Format (MDCF)', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`For the month of: ${monthName}`, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
    
    doc.autoTable({
        body: [
            [{ content: '1. School Details', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [251, 239, 218] }}],
            ['School Name:', schoolDetails.name, 'UDISE Code:', schoolDetails.udise],
            ['State:', schoolDetails.state, 'District:', schoolDetails.district],
            ['Block/Zone:', schoolDetails.block, 'Village/Ward:', schoolDetails.village],
            ['MDM Incharge:', mdmIncharge.name, 'Contact:', mdmIncharge.contact],
        ],
        startY: 25,
        theme: 'grid'
    });
    
    const summary = calculateMonthlySummary(data, month);
    const { riceAbstracts, cashAbstracts } = summary;

    const totalRiceAbstract = {
        opening: riceAbstracts.balvatika.opening + riceAbstracts.primary.opening + riceAbstracts.middle.opening,
        received: riceAbstracts.balvatika.received + riceAbstracts.primary.received + riceAbstracts.middle.received,
        total: riceAbstracts.balvatika.total + riceAbstracts.primary.total + riceAbstracts.middle.total,
        consumed: (riceAbstracts.balvatika.consumed || 0) + (riceAbstracts.primary.consumed || 0) + (riceAbstracts.middle.consumed || 0),
        balance: riceAbstracts.balvatika.balance + riceAbstracts.primary.balance + riceAbstracts.middle.balance
    };
     const totalCashAbstract = {
        opening: cashAbstracts.balvatika.opening + cashAbstracts.primary.opening + cashAbstracts.middle.opening,
        received: cashAbstracts.balvatika.received + cashAbstracts.primary.received + cashAbstracts.middle.received,
        total: cashAbstracts.balvatika.total + cashAbstracts.primary.total + cashAbstracts.middle.total,
        expenditure: (cashAbstracts.balvatika.expenditure || 0) + (cashAbstracts.primary.expenditure || 0) + (cashAbstracts.middle.expenditure || 0),
        balance: cashAbstracts.balvatika.balance + cashAbstracts.primary.balance + cashAbstracts.middle.balance
    };
    
    const abstractsBody = [
        ['Component', 'Opening Balance', 'Received', 'Total', 'Utilisation', 'Closing Balance'],
        [{ content: 'Rice (in Kgs)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [253, 246, 235] }}],
        ['  - Balvatika', riceAbstracts.balvatika.opening.toFixed(3), riceAbstracts.balvatika.received.toFixed(3), riceAbstracts.balvatika.total.toFixed(3), riceAbstracts.balvatika.consumed?.toFixed(3), riceAbstracts.balvatika.balance.toFixed(3)],
        ['  - Primary', riceAbstracts.primary.opening.toFixed(3), riceAbstracts.primary.received.toFixed(3), riceAbstracts.primary.total.toFixed(3), riceAbstracts.primary.consumed?.toFixed(3), riceAbstracts.primary.balance.toFixed(3)],
        ['  - Middle', riceAbstracts.middle.opening.toFixed(3), riceAbstracts.middle.received.toFixed(3), riceAbstracts.middle.total.toFixed(3), riceAbstracts.middle.consumed?.toFixed(3), riceAbstracts.middle.balance.toFixed(3)],
        [{ content: '  - Total', styles: { fontStyle: 'bold' } }, totalRiceAbstract.opening.toFixed(3), totalRiceAbstract.received.toFixed(3), totalRiceAbstract.total.toFixed(3), totalRiceAbstract.consumed.toFixed(3), totalRiceAbstract.balance.toFixed(3)],
        [{ content: 'Cash (in ₹)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [253, 246, 235] }}],
        ['  - Balvatika', cashAbstracts.balvatika.opening.toFixed(2), cashAbstracts.balvatika.received.toFixed(2), cashAbstracts.balvatika.total.toFixed(2), cashAbstracts.balvatika.expenditure?.toFixed(2), cashAbstracts.balvatika.balance.toFixed(2)],
        ['  - Primary', cashAbstracts.primary.opening.toFixed(2), cashAbstracts.primary.received.toFixed(2), cashAbstracts.primary.total.toFixed(2), cashAbstracts.primary.expenditure?.toFixed(2), cashAbstracts.primary.balance.toFixed(2)],
        ['  - Middle', cashAbstracts.middle.opening.toFixed(2), cashAbstracts.middle.received.toFixed(2), cashAbstracts.middle.total.toFixed(2), cashAbstracts.middle.expenditure?.toFixed(2), cashAbstracts.middle.balance.toFixed(2)],
        [{ content: '  - Total', styles: { fontStyle: 'bold' } }, totalCashAbstract.opening.toFixed(2), totalCashAbstract.received.toFixed(2), totalCashAbstract.total.toFixed(2), totalCashAbstract.expenditure.toFixed(2), totalCashAbstract.balance.toFixed(2)],
    ];
    
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 5,
        theme: 'grid',
        head: [abstractsBody[0]],
        body: abstractsBody.slice(1),
        headStyles: { fillColor: [251, 239, 218] },
    });

    const mealDays = summary.monthEntries.filter(e => e.totalPresent > 0).length;
    doc.autoTable({
        body: [
            ['Total Meal Days this Month:', mealDays],
            ['IFA Tablets given (Boys/Girls):', `${healthStatus.ifaBoys} / ${healthStatus.ifaGirls}`],
            ['Students Screened by RBSK Team:', healthStatus.screenedByRBSK],
            ['Inspection Done:', inspectionReport.inspected ? 'Yes' : 'No'],
            ['Untoward Incidents:', inspectionReport.incidentsCount],
        ],
        startY: doc.lastAutoTable.finalY + 5,
        theme: 'grid',
    });

    const filename = `MDCF_${schoolDetails.name.replace(/\s+/g, '_')}_${month}.pdf`;
    return { dataUri: doc.output('datauristring'), filename };
};

const generateDailyConsumptionReport = (data: AppData, month: string) => {
    const doc = new jspdf.jsPDF({ orientation: 'landscape' }) as jsPDF;
    const { settings } = data;
    const { schoolDetails } = settings;

    const monthDate = new Date(`${month}-02T00:00:00Z`);
    const monthName = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Daily Consumption Register', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`For the month of: ${monthName} | School: ${schoolDetails.name}`, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });

    const summary = calculateMonthlySummary(data, month);
    const { monthEntries } = summary;

    const head = [[
        { content: 'Date', rowSpan: 2 },
        { content: 'Students Present', colSpan: 4, styles: { halign: 'center' } },
        { content: 'Consumption', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Reason for No Meal', rowSpan: 2 },
    ], [
        'Balvatika', 'Primary', 'Middle', 'Total',
        'Rice (kg)', 'Expenditure (₹)'
    ]];

    const body = monthEntries.map(entry => [
        new Date(entry.date + 'T00:00:00Z').toLocaleDateString('en-IN'),
        entry.present.balvatika,
        entry.present.primary,
        entry.present.middle,
        entry.totalPresent,
        entry.consumption.rice.toFixed(3),
        entry.consumption.total.toFixed(2),
        entry.reasonForNoMeal || ''
    ]);

    doc.autoTable({
        head,
        body,
        startY: 25,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { halign: 'center', valign: 'middle' },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { cellWidth: 'wrap' },
        }
    });

    const filename = `DailyConsumption_${schoolDetails.name.replace(/\s+/g, '_')}_${month}.pdf`;
    return { dataUri: doc.output('datauristring'), filename };
};

const generateRollStatementReport = (data: AppData) => {
    const doc = new jspdf.jsPDF() as jsPDF;
    const { settings } = data;
    const { schoolDetails, classRolls } = settings;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Student Roll Statement', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`School: ${schoolDetails.name} (${schoolDetails.udise})`, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });

    const head = [[
        { content: 'Class', rowSpan: 2 },
        { content: 'General', colSpan: 2, styles: { halign: 'center' } },
        { content: 'ST/SC', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Total', colSpan: 2, styles: { halign: 'center' } },
        { content: 'On Roll', rowSpan: 2 },
    ], [
        'Boys', 'Girls', 'Boys', 'Girls', 'Boys', 'Girls'
    ]];

    const calculateSectionTotals = (classes: ClassRoll[]) => {
        return classes.reduce((acc, cr) => {
            acc.general.boys += cr.general.boys;
            acc.general.girls += cr.general.girls;
            acc.stsc.boys += cr.stsc.boys;
            acc.stsc.girls += cr.stsc.girls;
            const totalBoys = cr.general.boys + cr.stsc.boys;
            const totalGirls = cr.general.girls + cr.stsc.girls;
            acc.total.boys += totalBoys;
            acc.total.girls += totalGirls;
            acc.total.onRoll += totalBoys + totalGirls;
            return acc;
        }, {
            general: { boys: 0, girls: 0 },
            stsc: { boys: 0, girls: 0 },
            total: { boys: 0, girls: 0, onRoll: 0 },
        });
    };
    
    const classOrder = CLASS_STRUCTURE.reduce((acc, c, index) => ({...acc, [c.id]: index}), {} as Record<string, number>);
    const sortFn = (a: ClassRoll, b: ClassRoll) => (classOrder[a.id] ?? 99) - (classOrder[b.id] ?? 99);

    const prePrimary = classRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id)).sort(sortFn);
    const primary = classRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)).sort(sortFn);
    const middle = classRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id)).sort(sortFn);
    
    const body: any[] = [];
    const sectionRow = (label: string, totals: ReturnType<typeof calculateSectionTotals>) => [
        { content: label, styles: { fontStyle: 'bold' } },
        totals.general.boys, totals.general.girls,
        totals.stsc.boys, totals.stsc.girls,
        totals.total.boys, totals.total.girls,
        { content: totals.total.onRoll, styles: { fontStyle: 'bold' } }
    ];

    const processSection = (title: string, classes: ClassRoll[]) => {
        if (classes.length === 0) return;
        body.push([{ content: title, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [253, 246, 235] } }]);
        classes.forEach(cr => {
            const totalBoys = cr.general.boys + cr.stsc.boys;
            const totalGirls = cr.general.girls + cr.stsc.girls;
            body.push([
                cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, totalBoys + totalGirls
            ]);
        });
        body.push(sectionRow(`${title.split(' ')[0]} Total`, calculateSectionTotals(classes)));
    }

    processSection('Pre-Primary', prePrimary);
    processSection('Primary (I-V)', primary);
    processSection('Middle (VI-VIII)', middle);

    body.push(sectionRow('Grand Total', calculateSectionTotals(classRolls)));

    doc.autoTable({
        head,
        body,
        startY: 25,
        theme: 'grid',
        styles: { fontSize: 9, halign: 'center' },
        headStyles: { halign: 'center', valign: 'middle' },
        didParseCell: function (data: any) {
            if (data.row.raw[0].content?.includes('Total')) {
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    const filename = `RollStatement_${schoolDetails.name.replace(/\s+/g, '_')}.pdf`;
    return { dataUri: doc.output('datauristring'), filename };
};

export const generatePDFReport = (reportType: string, data: AppData, month: string): { dataUri: string, filename: string } => {
    switch (reportType) {
        case 'mdcf':
            return generateMDCFReport(data, month);
        case 'daily_consumption':
            return generateDailyConsumptionReport(data, month);
        case 'roll_statement':
            return generateRollStatementReport(data);
        default:
            throw new Error(`Unknown report type: ${reportType}`);
    }
};