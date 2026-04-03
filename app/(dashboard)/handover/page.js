'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { db } from '@/lib/offline/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export default function HandoverPage() {
  const [handoffs, setHandoffs] = useState([]);
  const [patients, setPatients] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadHandoffs();
  }, []);

  async function loadHandoffs() {
    try {
      setIsLoading(true);
      
      const allHandoffs = await db.handoffs.toArray();
      const allPatients = await db.patients.toArray();
      
      const patientMap = {};
      allPatients.forEach(p => {
        if (!p.isDeleted) patientMap[p.id] = p;
      });

      const sortedHandoffs = allHandoffs.sort((a, b) => 
        new Date(b.shiftDate) - new Date(a.shiftDate)
      );

      setHandoffs(sortedHandoffs);
      setPatients(patientMap);
    } catch (error) {
      console.error('Failed to load handoffs:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredHandoffs = handoffs.filter(handoff => {
    const patient = patients[handoff.patientId];
    const matchesSearch = !searchQuery || 
      (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())) ||
      handoff.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || handoff.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    
    const labels = {
      pending: 'Pending',
      completed: 'Completed',
      in_progress: 'In Progress',
    };

    return (
      <Badge variant="outline" className={cn("text-xs whitespace-nowrap", styles[status] || styles.pending)}>
        {labels[status] || status}
      </Badge>
    );
  };

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Shift Handover</h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">
              {isLoading ? 'Loading...' : `${handoffs.length} handover records`}
            </p>
          </div>
          <Link href="/handover/new" className="w-full sm:w-auto">
            <Button className="btn-glass w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Handover
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="glass mb-4 md:mb-6">
        <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by patient or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input pl-10 w-full"
            />
          </div>

          {/* Filter Buttons - Horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {filterButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setFilterStatus(btn.key)}
                className={cn(
                  "px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                  filterStatus === btn.key
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-gray-400 hover:bg-white/5 border border-transparent"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Handoffs List */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg md:text-xl">Handover Records</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : filteredHandoffs.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-gray-400">
              <ClipboardList className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-50" />
              <p className="text-sm md:text-base">No handover records found</p>
              <Link href="/handover/new" className="text-purple-400 hover:text-purple-300 mt-2 inline-block text-sm">
                Create your first handover
              </Link>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {filteredHandoffs.map((handoff) => {
                const patient = patients[handoff.patientId];
                
                return (
                  <Link
                    key={handoff.id}
                    href={`/handover/${handoff.id}`}
                    className="block p-3 md:p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Top Row: Status + Date */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(handoff.status)}
                        </div>
                        <span className="text-xs md:text-sm text-gray-400 flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(handoff.shiftDate).toLocaleDateString('en-NG', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          <span className="hidden sm:inline">
                            {' '}{new Date(handoff.shiftDate).toLocaleTimeString('en-NG', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </span>
                      </div>

                      {/* Patient Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-white group-hover:text-purple-300 transition-colors text-base md:text-lg truncate">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                          </h3>
                          {patient?.hospitalId && (
                            <p className="text-xs md:text-sm text-gray-500">
                              {patient.hospitalId}
                            </p>
                          )}
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {handoff.summary || 'No summary provided'}
                          </p>
                        </div>
                        
                        <div className="flex-shrink-0 text-gray-500 group-hover:text-purple-400 transition-colors self-center">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Bottom Row: Tasks indicator */}
                      {handoff.tasks?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400">
                            {handoff.tasks.filter(t => !t.completed).length} pending tasks
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}