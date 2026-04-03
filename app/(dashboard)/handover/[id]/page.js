'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  ClipboardList,
  CheckSquare,
  Square,
    Plus
} from 'lucide-react';
import { db } from '@/lib/offline/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export default function HandoverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const handoffId = params.id;

  const [handoff, setHandoff] = useState(null);
  const [patient, setPatient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHandoffData();
  }, [handoffId]);

  async function loadHandoffData() {
    try {
      setIsLoading(true);

      const handoffData = await db.handoffs.get(handoffId);
      if (!handoffData) {
        router.push('/handover');
        return;
      }

      const patientData = await db.patients.get(handoffData.patientId);
      const taskData = await db.tasks.where('handoffId').equals(handoffId).toArray();

      setHandoff(handoffData);
      setPatient(patientData);
      setTasks(taskData);
    } catch (error) {
      console.error('Failed to load handoff:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await db.tasks.update(taskId, {
        completed: !task.completed,
        updatedAt: new Date(),
        syncStatus: 'pending'
      });

      // Reload tasks
      const updatedTasks = await db.tasks.where('handoffId').equals(handoffId).toArray();
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  async function completeHandoff() {
    try {
      await db.handoffs.update(handoffId, {
        status: 'completed',
        updatedAt: new Date(),
        syncStatus: 'pending'
      });

      await loadHandoffData();
    } catch (error) {
      console.error('Failed to complete handoff:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!handoff || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass p-8 text-center">
          <p className="text-gray-400 mb-4">Handover not found</p>
          <Link href="/handover">
            <Button className="btn-glass">Back to Handovers</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/handover">
            <Button variant="outline" size="sm" className="glass-input">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Shift Handover</h1>
              <Badge
                variant="outline"
                className={cn(
                  handoff.status === 'completed'
                    ? "border-green-500/50 text-green-400"
                    : "border-yellow-500/50 text-yellow-400"
                )}
              >
                {handoff.status === 'completed' ? 'Completed' : 'Pending'}
              </Badge>
            </div>
            <p className="text-gray-400 mt-1">
              {new Date(handoff.shiftDate).toLocaleString('en-NG')}
            </p>
          </div>
        </div>

        {handoff.status !== 'completed' && (
          <Button onClick={completeHandoff} className="btn-glass">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xl font-semibold text-white">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-gray-400">{patient.hospitalId || 'No ID'} • {patient.gender}</p>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>Ward: {handoff.wardId}</span>
              </div>
              {handoff.bedNumber && (
                <div className="flex items-center gap-2 text-gray-400">
                  <span>Bed: {handoff.bedNumber}</span>
                </div>
              )}
            </div>

            <Link href={`/patients/${patient.id}`}>
              <Button variant="outline" className="w-full glass-input mt-2">
                View Patient Record
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* SOAP Notes */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              SOAP Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Subjective</h4>
              <p className="text-white bg-white/5 p-3 rounded-lg">{handoff.subjective}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Objective</h4>
              <p className="text-white bg-white/5 p-3 rounded-lg">{handoff.objective}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Assessment</h4>
              <p className="text-white bg-white/5 p-3 rounded-lg">{handoff.assessment}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Plan</h4>
              <p className="text-white bg-white/5 p-3 rounded-lg">{handoff.plan}</p>
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        {handoff.criticalAlerts?.length > 0 && (
          <Card className="glass border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {handoff.criticalAlerts.map((alert) => (
                  <Badge key={alert} variant="destructive" className="text-sm">
                    {alert.replace('_', ' ').toUpperCase()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        <Card className={cn("glass", pendingTasks.length === 0 && "border-green-500/20")}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              Tasks
              <Badge variant="secondary" className="ml-2">
                {completedTasks.length}/{tasks.length} done
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tasks assigned</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handoff.status !== 'completed' && toggleTask(task.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all",
                      handoff.status !== 'completed' ? "cursor-pointer hover:bg-white/5" : "",
                      task.completed ? "bg-green-500/10" : "bg-white/5"
                    )}
                  >
                    {task.completed ? (
                      <CheckSquare className="w-5 h-5 text-green-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <p className={cn("text-sm", task.completed ? "text-gray-500 line-through" : "text-white")}>
                        {task.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        task.priority === 'critical' && "border-red-500/50 text-red-400",
                        task.priority === 'high' && "border-orange-500/50 text-orange-400",
                        task.priority === 'medium' && "border-yellow-500/50 text-yellow-400",
                        task.priority === 'low' && "border-green-500/50 text-green-400"
                      )}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Handoff Info */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white text-sm">Handoff Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>From</span>
              <span className="text-gray-300">{handoff.fromStaffId || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>To</span>
              <span className="text-gray-300">{handoff.toStaffId}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Created</span>
              <span className="text-gray-300">
                {new Date(handoff.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Sync Status</span>
              <span className={handoff.syncStatus === 'synced' ? 'text-green-400' : 'text-yellow-400'}>
                {handoff.syncStatus === 'synced' ? '✓ Synced' : '⏳ Pending'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}