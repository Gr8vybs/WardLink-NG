"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/offline/db";

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      setIsLoading(true);
      setDebugInfo("Loading...");

      // Check if db is accessible
      if (!db) {
        setDebugInfo("ERROR: Database not initialized");
        return;
      }

      setDebugInfo("Database found, querying...");

      // Try to count all patients first
      const totalCount = await db.patients.count();
      setDebugInfo(`Total patients in DB: ${totalCount}`);

      // Get all patients (including deleted for debugging)
      const allPatients = await db.patients.toArray();
      console.log("All patients:", allPatients);

      // Now filter non-deleted
      const activePatients = allPatients.filter(p => !p.isDeleted);
      setDebugInfo(`Found ${activePatients.length} active patients (total: ${totalCount})`);

      setPatients(activePatients);
    } catch (error) {
      console.error("Failed to load patients:", error);
      setDebugInfo(`ERROR: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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
              {searchQuery ? "No patients match your search" : "No patients yet. Add your first patient!"}
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
                              {patient.allergies.length} Allergy
                            </Badge>
                          )}
                          {patient.chronicConditions?.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                              {patient.chronicConditions.length} Condition
                            </Badge>
                          )}
                        </div>
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
