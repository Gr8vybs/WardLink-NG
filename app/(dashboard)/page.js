'use client';

import { cn } from '@/lib/utils/cn';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  ClipboardList,
  AlertCircle,
  TrendingUp,
  Plus,
  ArrowRight
} from 'lucide-react';
import { db } from '@/lib/offline/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAdmissions: 0,
    pendingHandovers: 0,
    criticalTasks: 0,
    recentPatients: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const allPatients = await db.patients.toArray();
        const activePatients = allPatients.filter(p => !p.isDeleted);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAdmissions = activePatients.filter(p => {
          const created = new Date(p.createdAt);
          return created >= today;
        });

        // Get actual pending handoffs from database
        const allHandoffs = await db.handoffs.toArray();
        const pendingHandoffs = allHandoffs.filter(h => h.status === 'pending').length;

        // Get critical tasks
        const allTasks = await db.tasks.toArray();
        const criticalTasks = allTasks.filter(t =>
          !t.completed && (t.priority === 'critical' || t.priority === 'high')
        ).length;

        const recentPatients = activePatients
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        setStats({
          totalPatients: activePatients.length,
          todayAdmissions: todayAdmissions.length,
          pendingHandovers: pendingHandoffs,
          criticalTasks: criticalTasks,
          recentPatients
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Total Patients',
      value: stats.totalPatients,
      icon: Users,
      color: 'blue',
      link: '/patients',  // ✅ Fixed: links to existing patients page
      description: 'View all patients'
    },
    {
      title: "Today's Admissions",
      value: stats.todayAdmissions,
      icon: TrendingUp,
      color: 'green',
      link: '/patients',  // ✅ Fixed: links to patients page (filtered view can be added later)
      description: 'View recent admissions'
    },
    {
      title: 'Pending Handovers',
      value: stats.pendingHandovers,
      icon: ClipboardList,
      color: 'yellow',
      link: '/handover',  // ✅ Fixed: links to handover page
      description: 'View pending handovers'
    },
    {
      title: 'Critical Tasks',
      value: stats.criticalTasks,
      icon: AlertCircle,
      color: 'red',
      link: '/handover',  // ✅ Fixed: links to handover page with tasks
      description: 'View critical tasks'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back to WardLink NG</p>
        </div>
        <Link href="/patients/new">
          <Button className="btn-glass">
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            green: 'bg-green-500/20 text-green-400 border-green-500/30',
            yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            red: 'bg-red-500/20 text-red-400 border-red-500/30',
          };

          return (
            <Link key={stat.title} href={stat.link} className="block">
              <Card className="glass hover:bg-white/10 transition-all cursor-pointer group h-full">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">{stat.title}</p>
                      <p className="text-2xl md:text-3xl font-bold text-white mt-2">{stat.value}</p>
                    </div>
                    <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-lg border flex items-center justify-center", colorClasses[stat.color])}>
                      <Icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm text-gray-500 group-hover:text-purple-400 transition-colors">
                    <span>{stat.description}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Patients */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Recent Admissions</CardTitle>
            <CardDescription className="text-gray-400">
              Latest patients registered in the system
            </CardDescription>
          </div>
          <Link href="/patients">
            <Button variant="outline" size="sm" className="glass-input">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentPatients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No patients registered yet</p>
              <Link href="/patients/new" className="text-purple-400 hover:text-purple-300 mt-2 inline-block">
                Add your first patient
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentPatients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-8 h-10 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white group-hover:text-purple-300 transition-colors truncate">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {patient.hospitalId || 'No ID'} • {patient.gender}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {patient.allergies?.length > 0 && (
                      <Badge variant="destructive" className="text-xs hidden sm:inline-flex">
                        {patient.allergies.length} Allergy{patient.allergies.length > 1 ? 'ies' : 'y'}
                      </Badge>
                    )}
                    {patient.chronicConditions?.length > 0 && (
                      <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                        {patient.chronicConditions.length} Condition{patient.chronicConditions.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}