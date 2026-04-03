"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, AlertTriangle, Loader2, Database, Cloud, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/offline/db";
import { syncEngine } from "@/lib/offline/sync";
import { requestPersistentStorage, checkStorageQuota } from "@/lib/utils/storage";

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    pendingChanges: 0,
    isSyncing: false,
  });
  const [storageInfo, setStorageInfo] = useState({ granted: false, checked: false });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    // Request persistent storage
    const storage = await requestPersistentStorage();
    setStorageInfo({ ...storage, checked: true });

    // Load initial data
    await loadPatients();

    // Get sync status
    updateSyncStatus();

    // Listen for sync updates
    const interval = setInterval(updateSyncStatus, 5000);
    return () => clearInterval(interval);
  }

  async function loadPatients() {
    try {
      setIsLoading(true);
      const allPatients = await db.patients.toArray();
      const activePatients = allPatients.filter(p => !p.isDeleted);
      setPatients(activePatients);
    } catch (error) {
      console.error("Failed to load patients:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateSyncStatus() {
    const status = await syncEngine.getSyncStatus();
    setSyncStatus(status);
  }

  async function handleManualSync() {
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    const result = await syncEngine.triggerSync();
    await updateSyncStatus();
    await loadPatients(); // Refresh to show synced status
  }

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    return (
      patient.firstName.toLowerCase().includes(query) ||
      patient.lastName.toLowerCase().includes(query) ||
      (patient.hospitalId && patient.hospitalId.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      {/* Storage & Sync Status Bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Storage persistence warning */}
        {storageInfo.checked && !storageInfo.granted && (
          <div className="flex-1 min-w-[200px] p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-200 text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Storage not persistent. Data may be lost if browser closes.
            </p>
          </div>
        )}

        {/* Sync status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${syncStatus.isOnline
          ? "bg-green-500/20 border-green-500/50 text-green-200"
          : "bg-red-500/20 border-red-500/50 text-red-200"
          }`}>
          {syncStatus.isOnline ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          <span className="text-sm">
            {syncStatus.isOnline ? "Online" : "Offline"}
            {syncStatus.pendingChanges > 0 && ` • ${syncStatus.pendingChanges} pending`}
          </span>
          {syncStatus.pendingChanges > 0 && syncStatus.isOnline && (
            <button
              onClick={handleManualSync}
              disabled={syncStatus.isSyncing}
              className="ml-2 p-1 hover:bg-white/10 rounded"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Patients</h1>
          <p className="text-gray-400 mt-1">
            {isLoading ? "Loading..." : `${patients.length} patients registered`}
          </p>
        </div>
        <Link href="/patients/new">
          <Button className="btn-glass">
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="glass mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or hospital ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-white">
            All Patients ({filteredPatients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No patients yet. Add your first patient!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Hospital ID</TableHead>
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Gender</TableHead>
                    <TableHead className="text-gray-400">Phone</TableHead>
                    <TableHead className="text-gray-400">Alerts</TableHead>
                    <TableHead className="text-gray-400">Sync</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className="border-gray-700 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        {patient.hospitalId || "—"}
                      </TableCell>
                      <TableCell className="text-white">
                        {patient.firstName} {patient.lastName}
                      </TableCell>
                      <TableCell className="capitalize text-gray-300">
                        {patient.gender}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {patient.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {patient.allergies?.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {patient.allergies.length}
                            </Badge>
                          )}
                          {patient.chronicConditions?.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                              {patient.chronicConditions.length}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.syncStatus === "pending" ? (
                          <span className="text-yellow-400 text-xs">⏳ Pending</span>
                        ) : (
                          <span className="text-green-400 text-xs">✓ Synced</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
