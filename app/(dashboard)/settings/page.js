'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Database,
  Trash2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportPatientsToJSON, exportPatientsToCSV, importFromJSON } from '@/lib/utils/export';
import { db } from '@/lib/offline/db';
import { cn } from '@/lib/utils/cn';

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    checkStorage();
  }, []);

  async function checkStorage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      setStorageInfo({
        used: (estimate.usage / 1024 / 1024).toFixed(2),
        total: estimate.quota ? (estimate.quota / 1024 / 1024).toFixed(2) : 'Unknown',
        percent: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(1) : 0
      });
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      const result = await importFromJSON(file);
      setImportStatus({ type: 'success', message: `Imported ${result.patientsImported} patients` });
      await checkStorage();
    } catch (error) {
      setImportStatus({ type: 'error', message: error.message });
    } finally {
      setIsImporting(false);
    }
  }

  async function clearAllData() {
    if (!confirm('WARNING: This will delete ALL data. Are you sure?')) return;
    if (!confirm('Really sure? This cannot be undone.')) return;

    await db.delete();
    window.location.reload();
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl">
        {/* Data Export */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-400" />
              Export Data
            </CardTitle>
            <CardDescription className="text-gray-400">
              Backup your patient records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={exportPatientsToJSON}
              className="w-full btn-glass justify-start"
              variant="outline"
            >
              <Database className="w-4 h-4 mr-2" />
              Export Full Backup (JSON)
            </Button>
            <Button
              onClick={exportPatientsToCSV}
              className="w-full glass-input justify-start"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Patients (CSV)
            </Button>
          </CardContent>
        </Card>

        {/* Data Import */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              Import Data
            </CardTitle>
            <CardDescription className="text-gray-400">
              Restore from backup file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isImporting}
              />
              <Button
                className="w-full glass-input justify-start cursor-pointer"
                variant="outline"
                disabled={isImporting}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Select Backup File'}
                </span>
              </Button>
            </label>

            {importStatus && (
              <div className={cn(
                "mt-3 p-3 rounded-lg flex items-center gap-2 text-sm",
                importStatus.type === 'success' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              )}>
                {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {importStatus.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Info */}
        {storageInfo && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Used</span>
                  <span className="text-white">{storageInfo.used} MB</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(storageInfo.percent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {storageInfo.percent}% of available storage used
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="glass border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-gray-400">
              Irreversible actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={clearAllData}
              className="w-full bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
              variant="outline"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}