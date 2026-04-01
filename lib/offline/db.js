import Dexie from "dexie";
import {
  v4 as uuidv4
} from "uuid";

export class WardLinkDB extends Dexie {
  constructor() {
    super("WardLinkNG");

    this.version(1).stores({
      patients: "id, hospitalId, [firstName+lastName], [syncStatus+updatedAt], [createdAt+isDeleted], isDeleted",
      handoffs: "id, patientId, [wardId+shiftDate], [fromStaffId+shiftDate], [syncStatus+updatedAt], status",
      tasks: "id, handoffId, completed, [priority+completed]",
      syncQueue: "id, [table+timestamp], retryCount",
    });



    this.patients = this.table("patients");
    this.handoffs = this.table("handoffs");
    this.tasks = this.table("tasks");
    this.syncQueue = this.table("syncQueue");
  }

  generateId() {
    return `wl-${Date.now()}-${uuidv4().slice(0, 8)}`;
  }

  async softDeletePatient(id) {
    return this.patients.update(id, {
      isDeleted: true,
      updatedAt: new Date(),
      syncStatus: "pending",
    });
  }

  async getPendingPatients() {
    return this.patients
    .where("syncStatus")
    .equals("pending")
    .and((p) => !p.isDeleted)
    .toArray();
  }

  // Get patients created in the last 7 days (for "recent admissions" view)
  async getRecentPatients(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Should you use .and() or .filter() here?
    // Hint: You're checking createdAt >= cutoff AND isDeleted === false
  }


  async getTodayHandoffs(wardId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.handoffs
    .where("wardId")
    .equals(wardId)
    .and((h) => h.shiftDate >= today && h.shiftDate < tomorrow)
    .reverse()
    .sortBy("shiftDate");
  }

  async getCriticalPendingTasks() {
    return this.tasks
    .where("completed")
    .equals(0)
    .and((t) => t.priority === "critical" || t.priority === "high")
    .toArray();
  }

  async getPatientWithHistory(patientId) {
    const patient = await this.patients.get(patientId);
    if (!patient) return null;

    const handoffs = await this.handoffs
    .where("patientId")
    .equals(patientId)
    .reverse()
    .sortBy("shiftDate");

    return {
      ...patient,
      handoffs
    };
  }
}

export const db = new WardLinkDB();