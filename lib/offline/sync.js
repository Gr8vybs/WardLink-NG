import { db } from "./db.js";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export class SyncEngine {
  constructor() {
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this.syncInProgress = false;
    this.retryDelay = 5000; // Start with 5 seconds
    this.maxRetries = 5;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());

      // Sync when app becomes visible (user returns)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          console.log("📱 App visible — checking for pending syncs");
          this.triggerSync();
        }
      });
    }
  }

  handleOnline() {
    this.isOnline = true;
    this.retryDelay = 5000; // Reset delay
    console.log("📡 Online — triggering sync");
    this.triggerSync();
  }

  handleOffline() {
    this.isOnline = false;
    console.log("📵 Offline — queuing for later");
  }

  async triggerSync() {
    if (!this.isOnline || this.syncInProgress || !supabase) {
      return { success: false, message: "Cannot sync now" };
    }

    this.syncInProgress = true;
    const results = { pushed: 0, pulled: 0, errors: [] };

    try {
      // 1. Push pending patients
      const patientResults = await this.syncPatients();
      results.pushed += patientResults.pushed;
      results.errors.push(...patientResults.errors);

      // 2. Push pending handoffs
      const handoffResults = await this.syncHandoffs();
      results.pushed += handoffResults.pushed;
      results.errors.push(...handoffResults.errors);

      // 3. Pull remote changes
      await this.pullChanges();

      console.log("✅ Sync completed:", results);
      return { success: true, results };

    } catch (error) {
      console.error("❌ Sync failed:", error);

      // Schedule retry with exponential backoff
      this.scheduleRetry();

      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncPatients() {
    const results = { pushed: 0, errors: [] };

    const pending = await db.patients
      .where("syncStatus")
      .equals("pending")
      .toArray();

    for (const patient of pending) {
      try {
        const { error } = await supabase
          .from("patients")
          .upsert({
            id: patient.id,
            hospital_id: patient.hospitalId,
            first_name: patient.firstName,
            last_name: patient.lastName,
            date_of_birth: patient.dateOfBirth.toISOString(),
            gender: patient.gender,
            phone: patient.phone,
            address: patient.address,
            allergies: patient.allergies,
            chronic_conditions: patient.chronicConditions,
            is_deleted: patient.isDeleted,
            updated_at: patient.updatedAt.toISOString(),
          });

        if (error) throw error;

        // Mark as synced
        await db.patients.update(patient.id, {
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        });

        results.pushed++;

      } catch (error) {
        console.error(`Failed to sync patient ${patient.id}:`, error);
        results.errors.push({ id: patient.id, error: error.message });

        // Increment retry count
        await this.incrementRetry("patients", patient.id);
      }
    }

    return results;
  }

  async syncHandoffs() {
    const results = { pushed: 0, errors: [] };

    const pending = await db.handoffs
      .where("syncStatus")
      .equals("pending")
      .toArray();

    for (const handoff of pending) {
      try {
        const { error } = await supabase
          .from("handoffs")
          .upsert({
            id: handoff.id,
            patient_id: handoff.patientId,
            from_staff_id: handoff.fromStaffId,
            to_staff_id: handoff.toStaffId,
            shift_date: handoff.shiftDate.toISOString(),
            ward_id: handoff.wardId,
            bed_number: handoff.bedNumber,
            subjective: handoff.subjective,
            objective: handoff.objective,
            assessment: handoff.assessment,
            plan: handoff.plan,
            critical_alerts: handoff.criticalAlerts,
            pending_tasks: handoff.pendingTasks,
            status: handoff.status,
            updated_at: handoff.updatedAt.toISOString(),
          });

        if (error) throw error;

        await db.handoffs.update(handoff.id, {
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        });

        results.pushed++;

      } catch (error) {
        console.error(`Failed to sync handoff ${handoff.id}:`, error);
        results.errors.push({ id: handoff.id, error: error.message });
        await this.incrementRetry("handoffs", handoff.id);
      }
    }

    return results;
  }

  async pullChanges() {
    const lastSync = this.getLastSyncTime();

    // Pull patients updated since last sync
    const { data: remotePatients } = await supabase
      .from("patients")
      .select("*")
      .gt("updated_at", lastSync.toISOString());

    for (const remote of remotePatients || []) {
      const local = await db.patients.get(remote.id);

      // Skip if local is newer (conflict resolution)
      if (local && local.updatedAt > new Date(remote.updated_at)) {
        console.log("Conflict: local newer for", remote.id);
        continue;
      }

      await db.patients.put({
        id: remote.id,
        hospitalId: remote.hospital_id,
        firstName: remote.first_name,
        lastName: remote.last_name,
        dateOfBirth: new Date(remote.date_of_birth),
        gender: remote.gender,
        phone: remote.phone,
        address: remote.address,
        allergies: remote.allergies || [],
        chronicConditions: remote.chronic_conditions || [],
        isDeleted: remote.is_deleted,
        createdAt: new Date(remote.created_at),
        updatedAt: new Date(remote.updated_at),
        syncStatus: "synced",
        lastSyncedAt: new Date(),
      });
    }

    this.setLastSyncTime(new Date());
  }

  async incrementRetry(table, id) {
    // Could add retry tracking here
    console.log(`Retry scheduled for ${table}/${id}`);
  }

  scheduleRetry() {
    if (this.retryDelay > 60000) return; // Max 1 minute

    console.log(`⏰ Retrying in ${this.retryDelay}ms...`);

    setTimeout(() => {
      this.triggerSync();
    }, this.retryDelay);

    this.retryDelay *= 2; // Exponential backoff
  }

  getLastSyncTime() {
    if (typeof localStorage === "undefined") return new Date(0);
    const saved = localStorage.getItem("wardlink_last_sync");
    return saved ? new Date(saved) : new Date(0);
  }

  setLastSyncTime(date) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("wardlink_last_sync", date.toISOString());
    }
  }

  // Get sync status for UI display
  async getSyncStatus() {
    const pendingPatients = await db.patients.where("syncStatus").equals("pending").count();
    const pendingHandoffs = await db.handoffs.where("syncStatus").equals("pending").count();

    return {
      isOnline: this.isOnline,
      isSyncing: this.syncInProgress,
      pendingChanges: pendingPatients + pendingHandoffs,
      lastSync: this.getLastSyncTime(),
    };
  }
}

export const syncEngine = new SyncEngine();
