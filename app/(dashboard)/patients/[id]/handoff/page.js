"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  User,
  Clock,
  Stethoscope
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/offline/db";

export default function NewHandoffPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id;

  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handoff form state
  const [formData, setFormData] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    criticalAlerts: [],
    pendingTasks: [],
    toStaffId: "",
    wardId: "",
    bedNumber: "",
  });

  // New task input
  const [newTask, setNewTask] = useState({ description: "", priority: "medium" });

  // Available critical alerts
  const alertOptions = [
    { id: "allergy", label: "Allergy Alert", icon: "🚨" },
    { id: "dnr", label: "DNR / DNI on file", icon: "⚠️" },
    { id: "fall", label: "Fall Risk", icon: "🚶" },
    { id: "isolation", label: "Isolation Required", icon: "🔒" },
    { id: "npo", label: "NPO (Nothing by mouth)", icon: "🚫" },
  ];

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  async function loadPatient() {
    try {
      const p = await db.patients.get(patientId);
      if (!p) {
        router.push("/patients");
        return;
      }
      setPatient(p);
    } catch (error) {
      console.error("Failed to load patient:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAlert = (alertId) => {
    setFormData((prev) => {
      const hasAlert = prev.criticalAlerts.includes(alertId);
      return {
        ...prev,
        criticalAlerts: hasAlert
          ? prev.criticalAlerts.filter((a) => a !== alertId)
          : [...prev.criticalAlerts, alertId],
      };
    });
  };

  const addTask = () => {
    if (!newTask.description.trim()) return;

    setFormData((prev) => ({
      ...prev,
      pendingTasks: [
        ...prev.pendingTasks,
        {
          id: db.generateId(),
          description: newTask.description.trim(),
          priority: newTask.priority,
          completed: false,
        },
      ],
    }));
    setNewTask({ description: "", priority: "medium" });
  };

  const removeTask = (taskId) => {
    setFormData((prev) => ({
      ...prev,
      pendingTasks: prev.pendingTasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create handoff object
      const handoff = {
        id: db.generateId(),
        patientId: patientId,
        fromStaffId: "current-user", // TODO: Get from auth
        toStaffId: formData.toStaffId,
        shiftDate: new Date(),
        wardId: formData.wardId,
        bedNumber: formData.bedNumber,
        subjective: formData.subjective,
        objective: formData.objective,
        assessment: formData.assessment,
        plan: formData.plan,
        criticalAlerts: formData.criticalAlerts,
        pendingTasks: formData.pendingTasks,
        medications: [], // TODO: Add medication section
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: "pending",
      };

      // Save to IndexedDB
      await db.handoffs.add(handoff);

      console.log("✅ Handoff created:", handoff.id);

      // Redirect back to patient detail
      router.push(`/patients/${patientId}`);

    } catch (error) {
      console.error("Failed to create handoff:", error);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-purple-400">Loading...</div>
      </div>
    );
  }

  if (!patient) return null;

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
          href={`/patients/${patientId}`}
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {patient.firstName} {patient.lastName}
        </Link>
        <h1 className="text-3xl font-bold text-white">New Shift Handoff</h1>
        <p className="text-gray-400 mt-1">
          {patient.hospitalId || "No ID"} • {patient.gender}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

        {/* Location Info */}
        <Card className="glass">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Ward *</Label>
                <Input
                  value={formData.wardId}
                  onChange={(e) => handleChange("wardId", e.target.value)}
                  placeholder="e.g., Male Medical"
                  className="glass-input h-12"
                  required
                />
              </div>
              <div>
                <Label>Bed Number</Label>
                <Input
                  value={formData.bedNumber}
                  onChange={(e) => handleChange("bedNumber", e.target.value)}
                  placeholder="e.g., 12B"
                  className="glass-input h-12"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOAP Notes */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-purple-400" />
              SOAP Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subjective (Patient complaints) *</Label>
              <textarea
                value={formData.subjective}
                onChange={(e) => handleChange("subjective", e.target.value)}
                placeholder="Patient reports headache for 3 days..."
                className="glass-input w-full h-24 p-3 rounded-md resize-none"
                required
              />
            </div>
            <div>
              <Label>Objective (Vitals, exam findings) *</Label>
              <textarea
                value={formData.objective}
                onChange={(e) => handleChange("objective", e.target.value)}
                placeholder="BP: 160/95, HR: 88, Temp: 36.7°C..."
                className="glass-input w-full h-24 p-3 rounded-md resize-none"
                required
              />
            </div>
            <div>
              <Label>Assessment (Diagnosis/Impression) *</Label>
              <textarea
                value={formData.assessment}
                onChange={(e) => handleChange("assessment", e.target.value)}
                placeholder="Uncontrolled hypertension..."
                className="glass-input w-full h-20 p-3 rounded-md resize-none"
                required
              />
            </div>
            <div>
              <Label>Plan (Treatment plan) *</Label>
              <textarea
                value={formData.plan}
                onChange={(e) => handleChange("plan", e.target.value)}
                placeholder="Restart amlodipine 5mg daily..."
                className="glass-input w-full h-24 p-3 rounded-md resize-none"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="glass border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alertOptions.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => toggleAlert(alert.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${formData.criticalAlerts.includes(alert.id)
                    ? "bg-red-500/20 border-red-500/50 text-red-200"
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                >
                  <span className="mr-2">{alert.icon}</span>
                  {alert.label}
                  {formData.criticalAlerts.includes(alert.id) && (
                    <CheckCircle className="w-4 h-4 inline ml-2 text-red-400" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Pending Tasks for Next Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new task */}
            <div className="flex gap-2">
              <Input
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="e.g., Check BP at 6pm"
                className="glass-input flex-1"
              />
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="glass-input h-12 rounded-md px-3"
              >
                <option value="low" className="bg-gray-900">Low</option>
                <option value="medium" className="bg-gray-900">Medium</option>
                <option value="high" className="bg-gray-900">High</option>
                <option value="critical" className="bg-gray-900">Critical</option>
              </select>
              <Button
                type="button"
                onClick={addTask}
                className="btn-glass px-3"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Task list */}
            {formData.pendingTasks.length > 0 && (
              <div className="space-y-2">
                {formData.pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          task.priority === "critical" ? "bg-red-500/20 text-red-300" :
                            task.priority === "high" ? "bg-orange-500/20 text-orange-300" :
                              task.priority === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                                "bg-gray-500/20 text-gray-300"
                        }
                      >
                        {task.priority}
                      </Badge>
                      <span className="text-gray-200">{task.description}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Handoff To */}
        <Card className="glass">
          <CardContent className="p-6">
            <div>
              <Label>Handoff To (Receiving Staff) *</Label>
              <Input
                value={formData.toStaffId}
                onChange={(e) => handleChange("toStaffId", e.target.value)}
                placeholder="e.g., Nurse Amina or Dr. Ibrahim"
                className="glass-input h-12"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="btn-glass flex-1 h-14 text-lg font-semibold"
          >
            Complete Handoff
          </Button>
          <Link href={`/patients/${patientId}`}>
            <Button
              type="button"
              variant="outline"
              className="h-14 px-8 border-gray-600 text-gray-300 hover:bg-white/5"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
