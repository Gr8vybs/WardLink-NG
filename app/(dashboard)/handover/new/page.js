'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  ClipboardList,
  User,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X
} from 'lucide-react';
import { db } from '@/lib/offline/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export default function NewHandoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId');

  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patientId: preselectedPatientId || '',
    wardId: '',
    bedNumber: '',
    shiftDate: new Date().toISOString().slice(0, 16),
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    criticalAlerts: [],
    tasks: [],
    handoffTo: '',
    status: 'pending'
  });

  const [newTask, setNewTask] = useState({ text: '', priority: 'medium' });

  const criticalAlertOptions = [
    { id: 'allergy', label: 'Allergy Alert', icon: '🚨' },
    { id: 'dnr', label: 'DNR / DNI on file', icon: '⚠️' },
    { id: 'fall_risk', label: 'Fall Risk', icon: '🚶' },
    { id: 'isolation', label: 'Isolation Required', icon: '🔒' },
    { id: 'npo', label: 'NPO (Nothing by mouth)', icon: '🚫' },
  ];

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      const allPatients = await db.patients.toArray();
      const activePatients = allPatients.filter(p => !p.isDeleted);
      setPatients(activePatients);

      if (preselectedPatientId && activePatients.find(p => p.id === preselectedPatientId)) {
        setFormData(prev => ({ ...prev, patientId: preselectedPatientId }));
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleAlert = (alertId) => {
    setFormData(prev => ({
      ...prev,
      criticalAlerts: prev.criticalAlerts.includes(alertId)
        ? prev.criticalAlerts.filter(a => a !== alertId)
        : [...prev.criticalAlerts, alertId]
    }));
  };

  const addTask = () => {
    if (!newTask.text.trim()) return;

    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...newTask, id: Date.now(), completed: false }]
    }));
    setNewTask({ text: '', priority: 'medium' });
  };

  const removeTask = (taskId) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.patientId || !formData.wardId || !formData.handoffTo) {
      alert('Please fill in all required fields (Patient, Ward, Handoff To)');
      return;
    }

    setIsSubmitting(true);

    try {
      const handoffId = db.generateId();

      await db.handoffs.add({
        id: handoffId,
        patientId: formData.patientId,
        wardId: formData.wardId,
        bedNumber: formData.bedNumber || null,
        shiftDate: new Date(formData.shiftDate),
        subjective: formData.subjective,
        objective: formData.objective,
        assessment: formData.assessment,
        plan: formData.plan,
        criticalAlerts: formData.criticalAlerts,
        summary: `${formData.subjective?.slice(0, 50)}...`,
        fromStaffId: 'current-user',
        toStaffId: formData.handoffTo,
        status: formData.status,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending'
      });

      for (const task of formData.tasks) {
        await db.tasks.add({
          id: db.generateId(),
          handoffId: handoffId,
          description: task.text,
          priority: task.priority,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending'
        });
      }

      router.push('/handover');
    } catch (error) {
      console.error('Failed to create handover:', error);
      alert('Failed to create handover. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === formData.patientId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/handover">
            <Button variant="outline" size="sm" className="glass-input">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">New Shift Handoff</h1>
            {selectedPatient && (
              <p className="text-gray-400 mt-1 text-sm">
                {selectedPatient.hospitalId || 'No ID'} • {selectedPatient.gender}
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <Card className="glass">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient <span className="text-red-400">*</span></Label>
                <select
                  value={formData.patientId}
                  onChange={(e) => handleChange('patientId', e.target.value)}
                  className="flex h-12 w-full rounded-md glass-input px-3 py-2 text-sm bg-transparent text-white"
                  required
                >
                  <option value="" className="bg-[#1a1a2e]">Select patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id} className="bg-[#1a1a2e]">
                      {patient.firstName} {patient.lastName} {patient.hospitalId ? `(${patient.hospitalId})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Ward <span className="text-red-400">*</span></Label>
                <Input
                  value={formData.wardId}
                  onChange={(e) => handleChange('wardId', e.target.value)}
                  placeholder="e.g., Male Medical"
                  className="glass-input h-12"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bed Number</Label>
                <Input
                  value={formData.bedNumber}
                  onChange={(e) => handleChange('bedNumber', e.target.value)}
                  placeholder="e.g., 12B"
                  className="glass-input h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Shift Date & Time <span className="text-red-400">*</span></Label>
                <Input
                  type="datetime-local"
                  value={formData.shiftDate}
                  onChange={(e) => handleChange('shiftDate', e.target.value)}
                  className="glass-input h-12"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              SOAP Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subjective (Patient complaints) <span className="text-red-400">*</span></Label>
              <textarea
                value={formData.subjective}
                onChange={(e) => handleChange('subjective', e.target.value)}
                placeholder="Patient reports headache for 3 days..."
                className="flex w-full rounded-md glass-input px-3 py-2 text-sm min-h-[80px] resize-y"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Objective (Vitals, exam findings) <span className="text-red-400">*</span></Label>
              <textarea
                value={formData.objective}
                onChange={(e) => handleChange('objective', e.target.value)}
                placeholder="BP: 160/95, HR: 88, Temp: 36.7°C..."
                className="flex w-full rounded-md glass-input px-3 py-2 text-sm min-h-[80px] resize-y"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Assessment (Diagnosis/Impression) <span className="text-red-400">*</span></Label>
              <textarea
                value={formData.assessment}
                onChange={(e) => handleChange('assessment', e.target.value)}
                placeholder="Uncontrolled hypertension..."
                className="flex w-full rounded-md glass-input px-3 py-2 text-sm min-h-[80px] resize-y"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Plan (Treatment plan) <span className="text-red-400">*</span></Label>
              <textarea
                value={formData.plan}
                onChange={(e) => handleChange('plan', e.target.value)}
                placeholder="Restart amlodipine 5mg daily..."
                className="flex w-full rounded-md glass-input px-3 py-2 text-sm min-h-[80px] resize-y"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-400 flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {criticalAlertOptions.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => toggleAlert(alert.id)}
                  className={cn(
                    "p-2 md:p-3 rounded-lg border text-left transition-all flex items-center gap-2",
                    formData.criticalAlerts.includes(alert.id)
                      ? "bg-red-500/20 border-red-500/50 text-red-300"
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  )}
                >
                  <span className="text-lg">{alert.icon}</span>
                  <span className="text-xs md:text-sm leading-tight">{alert.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              Pending Tasks for Next Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newTask.text}
                onChange={(e) => setNewTask(prev => ({ ...prev, text: e.target.value }))}
                placeholder="e.g., Check BP at 6pm"
                className="glass-input flex-1"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
              />
              <div className="flex gap-2">
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                  className="glass-input w-28 md:w-32"
                >
                  <option value="low" className="bg-[#1a1a2e]">Low</option>
                  <option value="medium" className="bg-[#1a1a2e]">Medium</option>
                  <option value="high" className="bg-[#1a1a2e]">High</option>
                  <option value="critical" className="bg-[#1a1a2e]">Critical</option>
                </select>
                <Button type="button" onClick={addTask} className="btn-glass px-3">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {formData.tasks.length > 0 && (
              <div className="space-y-2">
                {formData.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs flex-shrink-0",
                          task.priority === 'critical' && "border-red-500/50 text-red-400",
                          task.priority === 'high' && "border-orange-500/50 text-orange-400",
                          task.priority === 'medium' && "border-yellow-500/50 text-yellow-400",
                          task.priority === 'low' && "border-green-500/50 text-green-400"
                        )}
                      >
                        {task.priority}
                      </Badge>
                      <span className="text-white text-sm truncate">{task.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4 md:p-6">
            <div className="space-y-2">
              <Label>Handoff To (Receiving Staff) <span className="text-red-400">*</span></Label>
              <Input
                value={formData.handoffTo}
                onChange={(e) => handleChange('handoffTo', e.target.value)}
                placeholder="e.g., Nurse Amina or Dr. Ibrahim"
                className="glass-input h-12"
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sticky bottom-4 bg-[#0f0f1a]/95 backdrop-blur-sm p-4 rounded-xl border border-white/10">
          <Link href="/handover" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="glass-input w-full">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="btn-glass w-full sm:w-auto"
            disabled={isSubmitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Complete Handoff'}
          </Button>
        </div>
      </form>
    </div>
  );
}