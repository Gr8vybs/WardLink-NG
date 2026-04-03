'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Save,
  X,
  User,
  Calendar,
  Phone,
  MapPin,
  AlertTriangle,
  Activity,
  FileText,
  Plus,
  History,
  Loader2
} from 'lucide-react';
import { db } from '@/lib/offline/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id;

  const [patient, setPatient] = useState(null);
  const [handoffs, setHandoffs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  async function loadPatientData() {
    try {
      setIsLoading(true);
      const patientData = await db.getPatientWithHistory(patientId);

      if (!patientData) {
        router.push('/patients');
        return;
      }

      setPatient(patientData);
      setHandoffs(patientData.handoffs || []);
      setEditedData({
        ...patientData,
        allergies: patientData.allergies?.join(', ') || '',
        chronicConditions: patientData.chronicConditions?.join(', ') || ''
      });
    } catch (error) {
      console.error('Failed to load patient:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEditChange(field, value) {
    setEditedData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const allergies = editedData.allergies
        ? editedData.allergies.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const chronicConditions = editedData.chronicConditions
        ? editedData.chronicConditions.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      await db.patients.update(patientId, {
        firstName: editedData.firstName,
        lastName: editedData.lastName,
        hospitalId: editedData.hospitalId || null,
        phone: editedData.phone || null,
        address: editedData.address || null,
        gender: editedData.gender,
        allergies,
        chronicConditions,
        updatedAt: new Date(),
        syncStatus: 'pending'
      });

      setIsEditing(false);
      await loadPatientData();
    } catch (error) {
      console.error('Failed to save patient:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this patient? This action can be undone before sync.')) {
      return;
    }

    try {
      await db.softDeletePatient(patientId);
      router.push('/patients');
    } catch (error) {
      console.error('Failed to delete patient:', error);
      alert('Failed to delete patient. Please try again.');
    }
  }

  // Calculate age properly
  const calculateAge = (dateOfBirth) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    if (age < 1) {
      const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
      if (months < 1) {
        const days = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
        return days < 1 ? 'Newborn' : `${days} days`;
      }
      return `${months} months`;
    }

    return `${age} years`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass p-8 text-center">
          <p className="text-gray-400 mb-4">Patient not found</p>
          <Link href="/patients">
            <Button className="btn-glass">Back to Patients</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="outline" size="sm" className="glass-input">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {isEditing ? 'Edit Patient' : patient.firstName + ' ' + patient.lastName}
            </h1>
            {!isEditing && (
              <p className="text-gray-400 mt-1 text-sm">
                {patient.hospitalId || 'No Hospital ID'} • {calculateAge(patient.dateOfBirth)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  className="glass-input"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  className="btn-glass"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="glass-input"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="glass-input text-red-400 hover:bg-red-500/20"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Patient Info Card */}
        <Card className="glass lg:col-span-2">
          <CardContent className="p-4 md:p-6">
            {isEditing ? (
              // EDIT MODE
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={editedData.firstName}
                      onChange={(e) => handleEditChange('firstName', e.target.value)}
                      className="glass-input h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={editedData.lastName}
                      onChange={(e) => handleEditChange('lastName', e.target.value)}
                      className="glass-input h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hospital ID</Label>
                    <Input
                      value={editedData.hospitalId || ''}
                      onChange={(e) => handleEditChange('hospitalId', e.target.value)}
                      className="glass-input h-12"
                      placeholder="FH/2025/001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select
                      value={editedData.gender}
                      onChange={(e) => handleEditChange('gender', e.target.value)}
                      className="flex h-12 w-full rounded-md glass-input px-3 py-2 text-sm bg-transparent text-white"
                    >
                      <option value="male" className="bg-[#1a1a2e]">Male</option>
                      <option value="female" className="bg-[#1a1a2e]">Female</option>
                      <option value="other" className="bg-[#1a1a2e]">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={editedData.phone || ''}
                      onChange={(e) => handleEditChange('phone', e.target.value)}
                      className="glass-input h-12"
                      placeholder="+234..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={editedData.address || ''}
                      onChange={(e) => handleEditChange('address', e.target.value)}
                      className="glass-input h-12"
                      placeholder="Address..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Allergies (comma-separated)
                  </Label>
                  <Input
                    value={editedData.allergies}
                    onChange={(e) => handleEditChange('allergies', e.target.value)}
                    className="glass-input h-12"
                    placeholder="Penicillin, Sulfa drugs..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-400 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Chronic Conditions (comma-separated)
                  </Label>
                  <Input
                    value={editedData.chronicConditions}
                    onChange={(e) => handleEditChange('chronicConditions', e.target.value)}
                    className="glass-input h-12"
                    placeholder="Hypertension, Diabetes..."
                  />
                </div>
              </div>
            ) : (
              // VIEW MODE
              <>
                {/* Patient Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl md:text-3xl font-bold text-white flex-shrink-0">
                    {patient.firstName[0]}{patient.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-bold text-white">
                      {patient.firstName} {patient.lastName}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                      {patient.hospitalId || 'No ID'} • {patient.gender} • Born {new Date(patient.dateOfBirth).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="break-all">{patient.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span>{patient.address || 'No address'}</span>
                  </div>
                </div>

                {/* Medical Info */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div>
                    <h4 className="text-red-400 flex items-center gap-2 mb-2 font-medium">
                      <AlertTriangle className="w-4 h-4" /> Allergies
                    </h4>
                    {patient.allergies?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {patient.allergies.map((allergy, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No known allergies</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-purple-400 flex items-center gap-2 mb-2 font-medium">
                      <Activity className="w-4 h-4" /> Chronic Conditions
                    </h4>
                    {patient.chronicConditions?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {patient.chronicConditions.map((condition, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No chronic conditions</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Both Full Width */}
                <div className="grid grid-cols-1 gap-3 mt-6 pt-6 border-t border-white/10">
                  <Link href={`/handover/new?patientId=${patientId}`} className="w-full">
                    <Button className="btn-glass w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      New Handoff
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    className="glass-input w-full"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Patient
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Handover History Sidebar */}
        <div className="space-y-4">
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                <History className="w-5 h-5 text-purple-400" />
                Handoff History ({handoffs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {handoffs.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No handover notes yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {handoffs.slice(0, 5).map((handoff) => (
                    <Link
                      key={handoff.id}
                      href={`/handover/${handoff.id}`}
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            handoff.status === 'completed'
                              ? "border-green-500/50 text-green-400"
                              : "border-yellow-500/50 text-yellow-400"
                          )}
                        >
                          {handoff.status}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(handoff.shiftDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-white line-clamp-2">
                        {handoff.summary || 'No summary'}
                      </p>
                    </Link>
                  ))}
                  {handoffs.length > 5 && (
                    <Link href="/handover">
                      <Button variant="ghost" className="w-full text-gray-400 hover:text-white text-sm">
                        View all {handoffs.length} handovers
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          {!isEditing && (
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Record Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Created</span>
                  <span className="text-gray-300">
                    {new Date(patient.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Updated</span>
                  <span className="text-gray-300">
                    {new Date(patient.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Sync</span>
                  <span className={patient.syncStatus === 'synced' ? 'text-green-400' : 'text-yellow-400'}>
                    {patient.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}