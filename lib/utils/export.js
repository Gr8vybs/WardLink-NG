import { db } from '@/lib/offline/db';

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
  a.download = `wardlink-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Validate structure
        if (!data.patients || !Array.isArray(data.patients)) {
          throw new Error('Invalid backup file format');
        }

        // Import patients
        for (const patient of data.patients) {
          await db.patients.put({
            ...patient,
            syncStatus: 'pending', // Mark for sync
            updatedAt: new Date()
          });
        }

        // Import handoffs if present
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