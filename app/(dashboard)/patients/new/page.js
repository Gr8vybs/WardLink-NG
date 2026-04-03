'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';
import { db } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    hospitalId: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    allergies: '',
    chronicConditions: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.gender) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const patientId = db.generateId();

      // Parse comma-separated values into arrays
      const allergies = formData.allergies
        ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const chronicConditions = formData.chronicConditions
        ? formData.chronicConditions.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      await db.patients.add({
        id: patientId,
        hospitalId: formData.hospitalId || null,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: new Date(formData.dateOfBirth),
        gender: formData.gender,
        phone: formData.phone || null,
        address: formData.address || null,
        allergies,
        chronicConditions,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending'
      });

      router.push('/patients');
    } catch (error) {
      console.error('Failed to create patient:', error);
      alert('Failed to create patient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="outline" size="sm" className="glass-input">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">New Patient</h1>
          <p className="text-gray-400 mt-1">Register a new patient to the ward</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-gray-400">
              Required fields are marked with *
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="Amina"
                  className="glass-input h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Abdullah"
                  className="glass-input h-12"
                  required
                />
              </div>
            </div>

            {/* Hospital ID & DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hospitalId">Hospital ID</Label>
                <Input
                  id="hospitalId"
                  value={formData.hospitalId}
                  onChange={(e) => handleChange('hospitalId', e.target.value)}
                  placeholder="FH/2025/001"
                  className="glass-input h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  className="glass-input h-12"
                  required
                />
              </div>
            </div>

            {/* Gender & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">
                  Gender <span className="text-red-400">*</span>
                </Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="flex h-12 w-full rounded-md glass-input px-3 py-2 text-sm bg-transparent text-white"
                  required
                >
                  <option value="" className="bg-[#1a1a2e]">Select gender</option>
                  <option value="male" className="bg-[#1a1a2e]">Male</option>
                  <option value="female" className="bg-[#1a1a2e]">Female</option>
                  <option value="other" className="bg-[#1a1a2e]">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+2348012345678"
                  className="glass-input h-12"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="12 Hospital Road, Ibadan"
                className="glass-input h-12"
              />
            </div>

            {/* Medical Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                <Input
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  placeholder="Penicillin, Sulfa drugs"
                  className="glass-input h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                <Input
                  id="chronicConditions"
                  value={formData.chronicConditions}
                  onChange={(e) => handleChange('chronicConditions', e.target.value)}
                  placeholder="Hypertension, Diabetes"
                  className="glass-input h-12"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/patients">
            <Button type="button" variant="outline" className="glass-input">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="btn-glass"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Patient'}
          </Button>
        </div>
      </form>
    </div>
  );
}