
import 'jspdf-autotable';
import { AppData, Settings, Category, ClassRoll } from '../types';
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

    // Use UTC to prevent timezone issues
    const monthDate = new Date(`${month}-02T00:00:00Z`);
    const monthName = monthDate.toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' });
    const year = monthDate.getUTCFullYear();
    const daysInMonth = new Date(year, monthDate.getUTCMonth() + 1, 0).getUTCDate();

    const categoriesInfo = [
        { key: 'balvatika' as Category, name: 'Balvatika' },
        { key: 'primary' as Category, name: 'Primary' },
        { key: 'middle' as Category, name: 'Middle' }
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
        doc.text('Daily Consumption Register', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Month: ${monthName}`, 14, 25);
        doc.text(`Year: ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
        doc.text(`Department: ${departmentName}`, doc.internal.pageSize.getWidth() - 14, 25, { align: 'right' });
        
        const head1 = ['S.No', 'Date', 'On Roll', 'Present', 'Foodgrain Served', 'Foodgrain Used (kg)', 'Dal/Veg (₹)', 'Salt/Cond (₹)', 'Fat/Oil (₹)', 'Fuel (₹)', 'Total (₹)', 'Signature'];
        const ratesTotalCost = settings.rates.dalVeg[category] + settings.rates.salt[category] + settings.rates.oilCond[category] + settings.rates.fuel[category];
        const head2 = [
            { content: 'Rates per Student', colSpan: 5, styles: { halign: 'right', fontStyle: 'italic', fontSize: 7 } },
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
            const date = new Date(Date.UTC(year, monthDate.getUTCMonth(), i));
            const dateString = date.toISOString().slice(0, 10);
            const formattedDate = date.toLocaleDateString('en-IN', { timeZone: 'UTC' });
            const dayOfWeek = date.getUTCDay();

            const entry = entries.find(e => e.id === dateString);
            
            if (dayOfWeek === 0) { // Sunday
                body.push([i, formattedDate, '', '', { content: 'Sunday', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic' } }, '']);
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
            headStyles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 40 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 18 },
                2: { cellWidth: 13 },
                3: { cellWidth: 13 },
                4: { cellWidth: 22 },
            },
            didDrawCell: (hookData: any) => {
                if (hookData.column.index > 4 && hookData.row.section === 'head' && hookData.row.index === 0) {
                    hookData.cell.styles.halign = 'right';
                }
            }
        });

        const { riceAbstract, cashAbstract } = calculateCategoryAbstract(data, month, category);
        const finalY = doc.lastAutoTable.finalY;
        
        doc.setFontSize(10);
        doc.text('Abstract', 14, finalY + 8);
        
        const abstractBody = [
            ['Opening Balance', `${riceAbstract.opening.toFixed(3)} kg`, `${cashAbstract.opening.toFixed(2)} ₹`],
            ['Received during month', `${riceAbstract.received.toFixed(3)} kg`, `${cashAbstract.received.toFixed(2)} ₹`],
            ['Total', `${riceAbstract.total.toFixed(3)} kg`, `${cashAbstract.total.toFixed(2)} ₹`],
            ['Consumed / Expenditure', `${riceAbstract.consumed.toFixed(3)} kg`, `${cashAbstract.expenditure.toFixed(2)} ₹`],
            ['Closing Balance', `${riceAbstract.closing.toFixed(3)} kg`, `${cashAbstract.closing.toFixed(2)} ₹`],
        ];
        
        doc.autoTable({
            head: [['', 'Foodgrain (Rice)', 'Amount (Cash)']],
            body: abstractBody,
            startY: finalY + 10,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 40 },
        });

        const signatureY = doc.lastAutoTable.finalY + 15;
        doc.text('Signature of MDM Incharge', doc.internal.pageSize.getWidth() - 14, signatureY, { align: 'right' });
    }

    return doc;
};


const generateRollStatementReport = (data: AppData) => {
    const doc = new jspdf.jsPDF() as jsPDF;
    const { settings } = data;
    const { schoolDetails } = settings;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.text('Student Roll Statement', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`UDISE: ${schoolDetails.udise}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, doc.internal.pageSize.getWidth() - 14, 30, { align: 'right' });

    const head = [
        [
            { content: 'Class', rowSpan: 2, styles: { valign: 'middle' } },
            { content: 'General', colSpan: 2, styles: { halign: 'center' } },
            { content: 'ST/SC', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Total', colSpan: 2, styles: { halign: 'center' } },
            { content: 'On Roll', rowSpan: 2, styles: { valign: 'middle' } },
        ],
        ['Boys', 'Girls', 'Boys', 'Girls', 'Boys', 'Girls']
    ];

    const body: any[] = [];
    let grandTotal = { gen_b: 0, gen_g: 0, stsc_b: 0, stsc_g: 0, total_b: 0, total_g: 0, on_roll: 0 };

    const classOrder = ['c8','c7','c6','c5','c4','c3','c2','c1','pp2','pp1','bal'];
    const sortedRolls = [...(settings.classRolls || [])].sort((a, b) => classOrder.indexOf(a.id) - classOrder.indexOf(b.id));

    sortedRolls.forEach(cr => {
        const totalBoys = cr.general.boys + cr.stsc.boys;
        const totalGirls = cr.general.girls + cr.stsc.girls;
        const onRoll = totalBoys + totalGirls;

        grandTotal.gen_b += cr.general.boys;
        grandTotal.gen_g += cr.general.girls;
        grandTotal.stsc_b += cr.stsc.boys;
        grandTotal.stsc_g += cr.stsc.girls;
        grandTotal.total_b += totalBoys;
        grandTotal.total_g += totalGirls;
        grandTotal.on_roll += onRoll;

        body.push([cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, onRoll]);
    });
    
    body.push([
        { content: 'Grand Total', styles: { fontStyle: 'bold' } },
        { content: grandTotal.gen_b, styles: { fontStyle: 'bold' } },
        { content: grandTotal.gen_g, styles: { fontStyle: 'bold' } },
        { content: grandTotal.stsc_b, styles: { fontStyle: 'bold' } },
        { content: grandTotal.stsc_g, styles: { fontStyle: 'bold' } },
        { content: grandTotal.total_b, styles: { fontStyle: 'bold' } },
        { content: grandTotal.total_g, styles: { fontStyle: 'bold' } },
        { content: grandTotal.on_roll, styles: { fontStyle: 'bold' } },
    ]);

    doc.autoTable({
        head: head,
        body: body,
        startY: 35,
        theme: 'grid',
        styles: { halign: 'center' },
        headStyles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 40 },
    });
    
    const finalY = doc.lastAutoTable.finalY;
    doc.text('Signature of MDM Incharge', doc.internal.pageSize.getWidth() - 14, finalY + 15, { align: 'right' });

    return doc;
};


const generateMDCFReport = (data: AppData, month: string) => {
    const doc = new jspdf.jsPDF() as jsPDF;
    const { settings } = data;
    const { schoolDetails, healthStatus, inspectionReport, cooks } = settings;
    
    const summary = calculateMonthlySummary(data, month);
    const { riceAbstracts, cashAbstracts, categoryTotals } = summary;
    
    // Use UTC to prevent timezone issues
    const monthDate = new Date(`${month}-02T00:00:00Z`);
    const monthName = monthDate.toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' });
    const year = monthDate.getUTCFullYear();
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Data Collection Format (MDCF)', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`For the month of ${monthName}, ${year}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    
    // --- School Details Table ---
    doc.autoTable({
        body: [
            [{ content: '1. School Details', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }],
            ['School Name', schoolDetails.name, 'UDISE Code', schoolDetails.udise],
            ['State', schoolDetails.state, 'District', schoolDetails.district],
            ['Block', schoolDetails.block, 'Village/Ward', schoolDetails.village],
            ['School Type', schoolDetails.type, 'Category', schoolDetails.category],
            ['Kitchen Type', schoolDetails.kitchenType, '', ''],
        ],
        startY: 30,
        theme: 'grid',
    });
    
    // --- Abstracts Table ---
    const abstractsBody = [
        [{ content: '2. Monthly Abstract', colSpan: 8, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }],
        [
            { content: '', rowSpan: 2, styles: { valign: 'middle' } },
            { content: 'Opening Balance', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Received', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Consumption/Expenditure', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Closing Balance', colSpan: 2, styles: { halign: 'center' } },
        ],
        ['Rice (kg)', 'Cash (₹)', 'Rice (kg)', 'Cash (₹)', 'Rice (kg)', 'Cash (₹)', 'Rice (kg)', 'Cash (₹)'],
    ];
    
    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    categories.forEach(cat => {
        abstractsBody.push([
            { content: cat.charAt(0).toUpperCase() + cat.slice(1), styles: { fontStyle: 'bold' } },
            riceAbstracts[cat].opening.toFixed(3),
            cashAbstracts[cat].opening.toFixed(2),
            riceAbstracts[cat].received.toFixed(3),
            cashAbstracts[cat].received.toFixed(2),
            riceAbstracts[cat].consumed?.toFixed(3),
            cashAbstracts[cat].expenditure?.toFixed(2),
            riceAbstracts[cat].balance.toFixed(3),
            cashAbstracts[cat].balance.toFixed(2),
        ]);
    });
    
    doc.autoTable({
        body: abstractsBody,
        startY: doc.lastAutoTable.finalY + 5,
        theme: 'grid',
        styles: { halign: 'right' },
        headStyles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 40 },
        // FIX: Removed `fontStyle: 'normal'` as it was causing a type error and was redundant.
        // The default font style is 'normal' anyway, and specific cells correctly override it to 'bold'.
        columnStyles: { 0: { halign: 'left' } },
    });

    // --- Student Attendance ---
    const attendanceBody: any[] = [
        [{ content: '3. Student Attendance', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }],
        [{ content: 'Category', styles: { fontStyle: 'bold' } }, { content: 'Total Present This Month', styles: { fontStyle: 'bold' } }, { content: 'Avg. Daily Attendance', styles: { fontStyle: 'bold' } }],
    ];
    const mealDays = summary.monthEntries.length;
    categories.forEach(cat => {
        const totalPresent = categoryTotals.present[cat];
        const avgAttendance = mealDays > 0 ? (totalPresent / mealDays).toFixed(2) : '0.00';
        attendanceBody.push([
            cat.charAt(0).toUpperCase() + cat.slice(1),
            totalPresent.toString(),
            avgAttendance,
        ]);
    });

    doc.autoTable({
        body: attendanceBody,
        startY: doc.lastAutoTable.finalY + 5,
        theme: 'grid',
        styles: { halign: 'center' },
        columnStyles: { 0: { halign: 'left' } },
    });

    // --- Cook Details, Health, Inspection ---
    const cookDetails = cooks.map((cook, i) => `${i + 1}. ${cook.name} (${cook.gender}, ${cook.category})`).join('\n') || 'No cooks listed.';

    const otherDetailsBody = [
        [{ content: '4. Other Details', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }],
        ['Cook-Cum-Helper(s)', cookDetails],
        ['IFA Tablets Given (Boys)', healthStatus.ifaBoys.toString()],
        ['IFA Tablets Given (Girls)', healthStatus.ifaGirls.toString()],
        ['Students Screened by RBSK', healthStatus.screenedByRBSK.toString()],
        ['Students Referred by RBSK', healthStatus.referredByRBSK.toString()],
        ['Inspection Done?', inspectionReport.inspected ? 'Yes' : 'No'],
        ['Untoward Incidents', inspectionReport.incidentsCount.toString()],
    ];

    doc.autoTable({
        body: otherDetailsBody,
        startY: doc.lastAutoTable.finalY + 5,
        theme: 'grid',
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    
    // --- Signature ---
    const finalY = doc.lastAutoTable.finalY;
    const signatureText = `Signature of MDM Incharge: ${settings.mdmIncharge?.name || '____________________'}`;
    doc.text(signatureText, doc.internal.pageSize.getWidth() - 14, finalY + 15, { align: 'right' });

    return doc;
};

export const generatePDFReport = (reportType: string, data: AppData, month: string) => {
    let doc: jsPDF;
    let filename: string;
    const schoolName = data.settings.schoolDetails.name.replace(/\s+/g, '_');
    const monthName = new Date(`${month}-02T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const year = month.slice(0, 4);

    switch (reportType) {
        case 'mdcf':
            doc = generateMDCFReport(data, month);
            filename = `MDCF_${schoolName}_${monthName}_${year}.pdf`;
            break;
        case 'roll_statement':
            doc = generateRollStatementReport(data);
            filename = `Roll_Statement_${schoolName}_${new Date().toISOString().slice(0, 10)}.pdf`;
            break;
        case 'daily_consumption':
            doc = generateDailyConsumptionReport(data, month);
            filename = `Consumption_Register_${schoolName}_${monthName}_${year}.pdf`;
            break;
        default:
            throw new Error('Invalid report type');
    }

    const dataUri = doc.output('datauristring');
    return { dataUri, filename };
};
