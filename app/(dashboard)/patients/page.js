'use client';

import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  ArrowUpDown
} from 'lucide-react';
import { db } from '@/lib/offline/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils/cn';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    gender: 'all',
    hasAllergies: false,
    hasConditions: false,
    dateRange: 'all', // all, today, week, month
    sortBy: 'newest', // newest, oldest, name_az, name_za
  });

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, patients]);

  async function loadPatients() {
    try {
      setIsLoading(true);
      const allPatients = await db.patients.toArray();
      const activePatients = allPatients.filter(p => !p.isDeleted);
      setPatients(activePatients);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    let result = [...patients];

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.firstName?.toLowerCase().includes(query) ||
        p.lastName?.toLowerCase().includes(query) ||
        p.hospitalId?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query)
      );
    }

    // Gender filter
    if (filters.gender !== 'all') {
      result = result.filter(p => p.gender === filters.gender);
    }

    // Allergies filter
    if (filters.hasAllergies) {
      result = result.filter(p => p.allergies?.length > 0);
    }

    // Conditions filter
    if (filters.hasConditions) {
      result = result.filter(p => p.chronicConditions?.length > 0);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (filters.dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }

      result = result.filter(p => new Date(p.createdAt) >= cutoff);
    }

    // Sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name_az':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'name_za':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        default:
          return 0;
      }
    });

    setFilteredPatients(result);
  }

  function clearFilters() {
    setFilters({
      gender: 'all',
      hasAllergies: false,
      hasConditions: false,
      dateRange: 'all',
      sortBy: 'newest',
    });
    setSearchQuery('');
  }

  const hasActiveFilters = filters.gender !== 'all' ||
    filters.hasAllergies ||
    filters.hasConditions ||
    filters.dateRange !== 'all' ||
    searchQuery;

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Patients</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {filteredPatients.length} of {patients.length} patients
            </p>
          </div>
          <Link href="/patients/new" className="w-full sm:w-auto">
            <Button className="btn-glass w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="glass mb-4">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Active
                  </Badge>
                )}
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Gender */}
                <div>
                  <Label className="text-xs text-gray-400 mb-1 block">Gender</Label>
                  <select
                    value={filters.gender}
                    onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full glass-input h-10 text-sm bg-transparent text-white"
                  >
                    <option value="all" className="bg-[#1a1a2e]">All Genders</option>
                    <option value="male" className="bg-[#1a1a2e]">Male</option>
                    <option value="female" className="bg-[#1a1a2e]">Female</option>
                    <option value="other" className="bg-[#1a1a2e]">Other</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <Label className="text-xs text-gray-400 mb-1 block">Admission Date</Label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full glass-input h-10 text-sm bg-transparent text-white"
                  >
                    <option value="all" className="bg-[#1a1a2e]">All Time</option>
                    <option value="today" className="bg-[#1a1a2e]">Today</option>
                    <option value="week" className="bg-[#1a1a2e]">Last 7 Days</option>
                    <option value="month" className="bg-[#1a1a2e]">Last 30 Days</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <Label className="text-xs text-gray-400 mb-1 block">Sort By</Label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full glass-input h-10 text-sm bg-transparent text-white"
                  >
                    <option value="newest" className="bg-[#1a1a2e]">Newest First</option>
                    <option value="oldest" className="bg-[#1a1a2e]">Oldest First</option>
                    <option value="name_az" className="bg-[#1a1a2e]">Name A-Z</option>
                    <option value="name_za" className="bg-[#1a1a2e]">Name Z-A</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400 block">Medical Filters</Label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasAllergies}
                      onChange={(e) => setFilters(prev => ({ ...prev, hasAllergies: e.target.checked }))}
                      className="rounded border-gray-600 bg-transparent text-purple-600 focus:ring-purple-500"
                    />
                    Has Allergies
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasConditions}
                      onChange={(e) => setFilters(prev => ({ ...prev, hasConditions: e.target.checked }))}
                      className="rounded border-gray-600 bg-transparent text-purple-600 focus:ring-purple-500"
                    />
                    Has Conditions
                  </label>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">
            {filteredPatients.length} Patients Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No patients match your criteria</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-purple-400 hover:text-purple-300 mt-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Patient</TableHead>
                    <TableHead className="text-gray-400 hidden md:table-cell">ID</TableHead>
                    <TableHead className="text-gray-400 hidden sm:table-cell">Gender</TableHead>
                    <TableHead className="text-gray-400 hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="text-gray-400">Alerts</TableHead>
                    <TableHead className="text-gray-400 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-medium text-white">
                            {patient.firstName[0]}{patient.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-xs text-gray-500 md:hidden">
                              {patient.hospitalId || 'No ID'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 hidden md:table-cell text-sm">
                        {patient.hospitalId || '—'}
                      </TableCell>
                      <TableCell className="text-gray-300 hidden sm:table-cell text-sm capitalize">
                        {patient.gender}
                      </TableCell>
                      <TableCell className="text-gray-300 hidden lg:table-cell text-sm">
                        {patient.phone || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {patient.allergies?.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
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
                      <TableCell className="text-right">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
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