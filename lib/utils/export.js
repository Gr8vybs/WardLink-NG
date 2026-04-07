
import { db } from '@/lib/offline/db';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';


// ==================== ORIGINAL FUNCTIONS ====================
export async function exportPatientsToJSON() {
  const patients = await db.patients.toArray();
  const handoffs = await db.handoffs.toArray();
  const tasks = await db.tasks.toArray();

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    patients: patients.filter(p => !p.isDeleted),
    handoffs,
    tasks,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wardlink-full-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPatientsToCSV() {
  const patients = await db.patients.toArray();
  const activePatients = patients.filter(p => !p.isDeleted);

  const headers = ['ID', 'Hospital ID', 'First Name', 'Last Name', 'Gender', 'Date of Birth', 'Phone', 'Address', 'Allergies', 'Conditions', 'Created At'];

  const rows = activePatients.map(p => [
    p.id,
    p.hospitalId || '',
    p.firstName,
    p.lastName,
    p.gender,
    new Date(p.dateOfBirth).toLocaleDateString(),
    p.phone || '',
    p.address || '',
    (p.allergies || []).join('; '),
    (p.chronicConditions || []).join('; '),
    new Date(p.createdAt).toLocaleDateString()
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wardlink-patients-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.patients || !Array.isArray(data.patients)) {
          throw new Error('Invalid backup file format');
        }

        for (const patient of data.patients) {
          await db.patients.put({
            ...patient,
            syncStatus: 'pending',
            updatedAt: new Date()
          });
        }

        if (data.handoffs) {
          for (const handoff of data.handoffs) {
            await db.handoffs.put({
              ...handoff,
              syncStatus: 'pending',
              updatedAt: new Date()
            });
          }
        }

        resolve({
          success: true,
          patientsImported: data.patients.length,
          handoffsImported: data.handoffs?.length || 0
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ==================== FULL REPORT EXPORTS (PDF + Excel) ====================
export async function exportFullReportToPDF() {
  const patients = await db.patients.toArray();
  const handoffs = await db.handoffs.toArray();
  const tasks = await db.tasks.toArray();

  const activePatients = patients.filter(p => !p.isDeleted);

  const doc = new jsPDF();

  // === HEADER ===
  doc.setFontSize(20);
  doc.text('WardLink NG - Full Clinical Report', 14, 20);

  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleString('en-NG')}`, 14, 30);
  doc.text(`Patients: ${activePatients.length} | Handoffs: ${handoffs.length} | Tasks: ${tasks.length}`, 14, 38);

  let yPosition = 55;

  // ====================== PATIENTS ======================
  doc.setFontSize(14);
  doc.text('Patients', 14, yPosition);
  yPosition += 10;

  const patientData = activePatients.map(p => [
    p.hospitalId || '—',
    `${p.firstName} ${p.lastName}`,
    p.gender || '—',
    new Date(p.dateOfBirth).toLocaleDateString('en-NG'),
    p.phone || '—',
    (p.allergies || []).join(', ') || 'None',
    (p.chronicConditions || []).join(', ') || 'None'
  ]);

  autoTable(doc, {
    head: [['Hospital ID', 'Name', 'Gender', 'DOB', 'Phone', 'Allergies', 'Conditions']],
    body: patientData,
    startY: yPosition,
    theme: 'grid',
    headStyles: { fillColor: [147, 51, 234] }, // WardLink purple
    margin: { left: 14, right: 14 }
  });
  yPosition = doc.lastAutoTable.finalY + 18;

  // ====================== HANDOFFS ======================
  if (handoffs.length > 0) {
    doc.setFontSize(14);
    doc.text('Handoff Records', 14, yPosition);
    yPosition += 10;

    const handoffData = handoffs.map(h => {
      const patient = activePatients.find(p => p.id === h.patientId);
      return [
        patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
        new Date(h.shiftDate).toLocaleDateString('en-NG'),
        h.wardId || '—',
        h.status || '—',
        h.fromStaffId || '—',
        h.toStaffId || '—',
        h.subjective?.slice(0, 40) || 'No summary' // Use subjective instead of summary
      ];
    });

    autoTable(doc, {
      head: [['Patient', 'Shift Date', 'Ward', 'Status', 'From', 'To', 'Summary']],
      body: handoffData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247] },
      margin: { left: 14, right: 14 }
    });
    yPosition = doc.lastAutoTable.finalY + 18;
  }

  // ====================== TASKS ======================
  if (tasks.length > 0) {
    doc.setFontSize(14);
    doc.text('Tasks', 14, yPosition);
    yPosition += 10;

    const taskData = tasks.map(t => {
      const handoff = handoffs.find(h => h.id === t.handoffId);
      const patient = handoff ? activePatients.find(p => p.id === handoff.patientId) : null;
      return [
        patient ? `${patient.firstName} ${patient.lastName}` : '—',
        t.description || '—',
        t.priority || '—',
        t.completed ? '✓ Completed' : 'Pending',
        handoff ? new Date(handoff.shiftDate).toLocaleDateString('en-NG') : '—'
      ];
    });

    autoTable(doc, {
      head: [['Patient', 'Task', 'Priority', 'Status', 'Handoff Date']],
      body: taskData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8] }, // Yellow for tasks
      margin: { left: 14, right: 14 }
    });
  }

  doc.save(`wardlink-full-report-${new Date().toISOString().split('T')[0]}.pdf`);
}



  export async function exportFullReportToExcel() {
    const patients = await db.patients.toArray();
    const handoffs = await db.handoffs.toArray();
    const tasks = await db.tasks.toArray();
    const activePatients = patients.filter(p => !p.isDeleted);

    const workbook = XLSX.utils.book_new();

    // Patients sheet
    const patientData = activePatients.map(p => ({
      ID: p.id,
      'Hospital ID': p.hospitalId || '',
      'First Name': p.firstName,
      'Last Name': p.lastName,
      Gender: p.gender,
      'Date of Birth': new Date(p.dateOfBirth).toLocaleDateString('en-NG'),
      Phone: p.phone || '',
      Address: p.address || '',
      Allergies: (p.allergies || []).join('; '),
      'Chronic Conditions': (p.chronicConditions || []).join('; '),
      'Created At': new Date(p.createdAt).toLocaleString('en-NG')
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(patientData), 'Patients');

    // Handoffs sheet
    const handoffData = handoffs.map(h => {
      const patient = activePatients.find(p => p.id === h.patientId);
      return {
        Patient: patient ? `\( {patient.firstName} \){patient.lastName}` : 'Unknown',
        'Hospital ID': patient?.hospitalId || '',
        'Shift Date': new Date(h.shiftDate).toLocaleString('en-NG'),
        Ward: h.wardId,
        Status: h.status,
        From: h.fromStaffId || '—',
        To: h.toStaffId || '—',
        Summary: h.summary || ''
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(handoffData), 'Handoffs');

    // Tasks sheet
    const taskData = tasks.map(t => {
      const handoff = handoffs.find(h => h.id === t.handoffId);
      const patient = handoff ? activePatients.find(p => p.id === handoff.patientId) : null;
      return {
        Patient: patient ? `\( {patient.firstName} \){patient.lastName}` : '—',
        'Task Description': t.description,
        Priority: t.priority,
        Status: t.completed ? 'Completed' : 'Pending',
        'Handoff Date': handoff ? new Date(handoff.shiftDate).toLocaleString('en-NG') : '—'
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(taskData), 'Tasks');

    XLSX.writeFile(workbook, `wardlink-full-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  }