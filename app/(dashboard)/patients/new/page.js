"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/offline/db";

export default function NewPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    hospitalId: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    address: "",
    allergies: "",
    chronicConditions: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(""); // Clear error on change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Transform form data to patient object
      const patient = {
        id: db.generateId(),
        hospitalId: formData.hospitalId || undefined,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: new Date(formData.dateOfBirth),
        gender: formData.gender,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        allergies: formData.allergies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        chronicConditions: formData.chronicConditions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: "pending", // Will sync to Supabase when online
        isDeleted: false,
      };

      // Save to IndexedDB
      await db.patients.add(patient);

      console.log("✅ Patient saved:", patient.id);

      // Redirect to patient list
      router.push("/patients");

    } catch (err) {
      console.error("Failed to save patient:", err);
      setError("Failed to save patient. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background gradient shapes */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/patients"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Link>
        <h1 className="text-3xl font-bold text-white">Add New Patient</h1>
        <p className="text-gray-400 mt-1">Enter patient details for ward registration</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Glassmorphism Form Card */}
      <Card className="glass max-w-2xl mx-auto">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Amina"
                  className="glass-input h-12"
                  required
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Abdullah"
                  className="glass-input h-12"
                  required
                />
              </div>
            </div>

            {/* Hospital ID & DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Hospital ID</Label>
                <Input
                  value={formData.hospitalId}
                  onChange={(e) => handleChange("hospitalId", e.target.value)}
                  placeholder="FH/2025/001"
                  className="glass-input h-12"
                />
              </div>
              <div>
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  className="glass-input h-12"
                  required
                />
              </div>
            </div>

            {/* Gender & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Gender *</Label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  className="glass-input h-12 w-full rounded-md px-3"
                  required
                >
                  <option value="" className="bg-gray-900">Select gender</option>
                  <option value="female" className="bg-gray-900">Female</option>
                  <option value="male" className="bg-gray-900">Male</option>
                  <option value="other" className="bg-gray-900">Other</option>
                </select>
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+2348012345678"
                  className="glass-input h-12"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="12 Hospital Road, Ibadan"
                className="glass-input h-12"
              />
            </div>

            {/* Medical Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Allergies (comma-separated)</Label>
                <Input
                  value={formData.allergies}
                  onChange={(e) => handleChange("allergies", e.target.value)}
                  placeholder="Penicillin, Sulfa drugs"
                  className="glass-input h-12"
                />
              </div>
              <div>
                <Label>Chronic Conditions</Label>
                <Input
                  value={formData.chronicConditions}
                  onChange={(e) => handleChange("chronicConditions", e.target.value)}
                  placeholder="Hypertension, Diabetes"
                  className="glass-input h-12"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="btn-glass w-full h-12 text-lg font-semibold"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {isSubmitting ? "Saving..." : "Register Patient"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
