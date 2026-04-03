"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Activity, Phone, MapPin, Calendar, User, FileText } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/offline/db";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState(null);
  const [handoffs, setHandoffs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const patientId = params.id;

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  async function loadPatientData() {
    try {
      setIsLoading(true);

      // Load patient with their handoff history
      const patientData = await db.getPatientWithHistory(patientId);

      if (!patientData) {
        console.error("Patient not found");
        router.push("/patients");
        return;
      }

      setPatient(patientData);
      setHandoffs(patientData.handoffs || []);
    } catch (error) {
      console.error("Failed to load patient:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-purple-400">Loading patient...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Patient not found</div>
      </div>
    );
  }

  // Calculate age from date of birth
  const age = Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <Link
          href="/patients"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Link>
      </div>

      {/* Patient Info Card */}
      <Card className="glass mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

            {/* Left: Patient Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <p className="text-gray-400">
                    {patient.hospitalId || "No Hospital ID"} • {patient.gender}, {age} years
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="w-4 h-4 text-purple-400" />
                    {patient.phone}
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    {patient.address}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Born: {new Date(patient.dateOfBirth).toLocaleDateString("en-NG")}
                </div>
              </div>

              {/* Medical Alerts */}
              <div className="mt-6 space-y-3">
                {patient.allergies?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-medium">Allergies</p>
                      <p className="text-gray-300">{patient.allergies.join(", ")}</p>
                    </div>
                  </div>
                )}
                {patient.chronicConditions?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Activity className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <p className="text-purple-300 font-medium">Chronic Conditions</p>
                      <p className="text-gray-300">{patient.chronicConditions.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col gap-2">
              <Link href={`/patients/${patientId}/handoff`}>
                <Button className="btn-glass w-full md:w-auto">
                  <FileText className="w-4 h-4 mr-2" />
                  New Handoff
                </Button>
              </Link>
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-white/5">
                Edit Patient
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Handoff History */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Handoff History ({handoffs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {handoffs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No handoffs yet. Create the first one!
            </div>
          ) : (
            <div className="space-y-4">
              {handoffs.map((handoff) => (
                <div
                  key={handoff.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2">
                    <span className="text-purple-300 font-medium">
                      {new Date(handoff.shiftDate).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400 text-sm">
                      {new Date(handoff.shiftDate).toLocaleTimeString("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true, // 12-hour format with AM/PM
                      })}
                    </span>
                  </div>

                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                      {handoff.status}
                    </Badge>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    {handoff.subjective?.slice(0, 100)}...
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>From: {handoff.fromStaffId}</span>
                    <span>→</span>
                    <span>To: {handoff.toStaffId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
