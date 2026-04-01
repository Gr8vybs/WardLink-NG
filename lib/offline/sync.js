import { db } from "./db.js";
import { createClient } from "@supabase/supabase-js";

// Supabase client - will fail gracefully if env vars missing
let supabase = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (error) {
  console.warn("Supabase not initialized:", error.message);
}

export class SyncEngine {
  constructor() {
    // Safe check for browser environment
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this.syncInProgress = false;

    // Only add event listeners in browser
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
    }
  }

  handleOnline() {
    this.isOnline = true;
    console.log("📡 Online — triggering sync");
    this.triggerSync();
  }

  handleOffline() {
    this.isOnline = false;
    console.log("📵 Offline — sync paused");
  }

  async pushChanges() {
    // Skip if no Supabase client
    if (!supabase) {
      console.warn("⚠️ Supabase not configured — skipping push");
      return;
    }

    const pendingPatients = await db.getPendingPatients();
    console.log(`Found ${pendingPatients.length} patients to sync`);

    for (const patient of pendingPatients) {
      try {
        const supabaseData = {
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
          created_at: patient.createdAt.toISOString(),
          updated_at: patient.updatedAt.toISOString(),
        };

        const { error } = await supabase
          .from("patients")
          .upsert(supabaseData);

        if (error) {
          console.error(`Failed to sync patient ${patient.id}:`, error.message);
          continue;
        }

        await db.patients.update(patient.id, {
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        });

        console.log(`✅ Synced patient ${patient.hospitalId}`);

      } catch (error) {
        console.error(`Error processing patient ${patient.id}:`, error.message);
      }
    }
  }

  async pullChanges() {
    // Skip if no Supabase client
    if (!supabase) {
      console.warn("⚠️ Supabase not configured — skipping pull");
      return;
    }

    const lastSync = this.getLastSyncTime();
    console.log(`Pulling changes since ${lastSync.toISOString()}`);

    try {
      const { data: remotePatients, error } = await supabase
        .from("patients")
        .select("*")
        .gt("updated_at", lastSync.toISOString());

      if (error) {
        console.error("Failed to pull changes:", error.message);
        return;
      }

      console.log(`Found ${remotePatients?.length || 0} remote changes`);

      for (const remote of remotePatients || []) {
        const local = await db.patients.get(remote.id);
        
        if (local && local.updatedAt > new Date(remote.updated_at)) {
          console.log(`Conflict: local newer for ${remote.id}`);
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

    } catch (error) {
      console.error("Pull changes error:", error.message);
    }
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

  async triggerSync() {
    if (!this.isOnline || this.syncInProgress) {
      return { 
        success: false, 
        message: "Already syncing or offline" 
      };
    }

    this.syncInProgress = true;
    const results = { pushed: 0, pulled: 0, errors: [] };

    try {
      console.log("🔄 Sync started...");
      
      // Count pending before push
      const pendingCount = await db.patients
        .where("syncStatus")
        .equals("pending")
        .count();
      
      if (pendingCount > 0) {
        await this.pushChanges();
        results.pushed = pendingCount;
      } else {
        console.log("No pending patients to push");
      }
      
      await this.pullChanges();
      
      console.log("✅ Sync completed");
      return { success: true, results };
      
    } catch (error) {
      console.error("❌ Sync failed:", error.message);
      results.errors.push(error.message);
      return { 
        success: false, 
        error: error.message, 
        results 
      };
      
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const syncEngine = new SyncEngine();
