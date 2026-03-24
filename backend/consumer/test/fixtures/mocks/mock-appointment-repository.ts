import { Appointment } from "../../../src/domain/entities/appointment.entity";
import { AppointmentRepository } from "../../../src/domain/ports/outbound/appointment.repository";
import { IdCard } from "../../../src/domain/value-objects/id-card.value-object";

/**
 * MockAppointmentRepository: Simulates AppointmentRepository for testing Use Cases.
 */
export class MockAppointmentRepository implements AppointmentRepository {
  findWaitingResult: Appointment[] = [];
  findCalledResult: Appointment[] = [];
  findAllResult: Appointment[] = [];
  findByIdResult: Appointment | null = null;
  findByIdCardAndActiveResult: Appointment | null = null;
  findAvailableOfficesResult: string[] = [];
  findExpiredCalledResult: Appointment[] = [];
  saveCalls: Appointment[] = [];
  updateStatusCalls: Array<{
    id: string;
    status: string;
  }> = [];
  throwOnFindWaiting = false;
  throwOnFindCalled = false;
  throwOnSave = false;
  throwOnUpdateStatus = false;
  throwOnFindByIdCardAndActive = false;
  throwOnFindAvailableOffices = false;
  throwOnFindExpiredCalled = false;

  setFindWaitingResult(result: Appointment[]) {
    this.findWaitingResult = result;
  }

  setFindCalledResult(result: Appointment[]) {
    this.findCalledResult = result;
  }

  setFindAllResult(result: Appointment[]) {
    this.findAllResult = result;
  }

  setFindByIdResult(result: Appointment | null) {
    this.findByIdResult = result;
  }

  setFindByIdCardAndActiveResult(result: Appointment | null) {
    this.findByIdCardAndActiveResult = result;
  }

  setFindAvailableOfficesResult(result: string[]) {
    this.findAvailableOfficesResult = result;
  }

  setFindExpiredCalledResult(result: Appointment[]) {
    this.findExpiredCalledResult = result;
  }

  setThrowOnFindWaiting(shouldThrow: boolean) {
    this.throwOnFindWaiting = shouldThrow;
  }

  setThrowOnFindCalled(shouldThrow: boolean) {
    this.throwOnFindCalled = shouldThrow;
  }

  setThrowOnSave(shouldThrow: boolean) {
    this.throwOnSave = shouldThrow;
  }

  setThrowOnUpdateStatus(shouldThrow: boolean) {
    this.throwOnUpdateStatus = shouldThrow;
  }

  setThrowOnFindByIdCardAndActive(shouldThrow: boolean) {
    this.throwOnFindByIdCardAndActive = shouldThrow;
  }

  setThrowOnFindAvailableOffices(shouldThrow: boolean) {
    this.throwOnFindAvailableOffices = shouldThrow;
  }

  setThrowOnFindExpiredCalled(shouldThrow: boolean) {
    this.throwOnFindExpiredCalled = shouldThrow;
  }

  async findWaiting(): Promise<Appointment[]> {
    if (this.throwOnFindWaiting) {
      throw new Error("FindWaiting failed");
    }
    return this.findWaitingResult;
  }

  async findCalled(): Promise<Appointment[]> {
    if (this.throwOnFindCalled) {
      throw new Error("FindCalled failed");
    }
    return this.findCalledResult;
  }

  async findAll(): Promise<Appointment[]> {
    return this.findAllResult;
  }

  async findById(_id: string): Promise<Appointment | null> {
    return this.findByIdResult;
  }

  async findByIdCardAndActive(_idCard: IdCard): Promise<Appointment | null> {
    if (this.throwOnFindByIdCardAndActive) {
      throw new Error("FindByIdCardAndActive failed");
    }
    return this.findByIdCardAndActiveResult;
  }

  async findAvailableOffices(_allOffices: string[]): Promise<string[]> {
    if (this.throwOnFindAvailableOffices) {
      throw new Error("FindAvailableOffices failed");
    }
    return this.findAvailableOfficesResult;
  }

  async findExpiredCalled(_now: number): Promise<Appointment[]> {
    if (this.throwOnFindExpiredCalled) {
      throw new Error("FindExpiredCalled failed");
    }
    return this.findExpiredCalledResult;
  }

  async save(appointment: Appointment): Promise<Appointment> {
    if (this.throwOnSave) {
      throw new Error("Save failed");
    }
    this.saveCalls.push(appointment);
    return appointment;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    if (this.throwOnUpdateStatus) {
      throw new Error("UpdateStatus failed");
    }
    this.updateStatusCalls.push({ id, status });
  }

  getLastSave(): Appointment | null {
    if (this.saveCalls.length === 0) {
      return null;
    }
    return this.saveCalls[this.saveCalls.length - 1];
  }

  getLastUpdate(): { id: string; status: string } | null {
    if (this.updateStatusCalls.length === 0) {
      return null;
    }
    return this.updateStatusCalls[this.updateStatusCalls.length - 1];
  }

  reset() {
    this.findWaitingResult = [];
    this.findCalledResult = [];
    this.findAllResult = [];
    this.findByIdResult = null;
    this.findByIdCardAndActiveResult = null;
    this.findAvailableOfficesResult = [];
    this.findExpiredCalledResult = [];
    this.saveCalls = [];
    this.updateStatusCalls = [];
    this.throwOnFindWaiting = false;
    this.throwOnFindCalled = false;
    this.throwOnSave = false;
    this.throwOnUpdateStatus = false;
    this.throwOnFindByIdCardAndActive = false;
    this.throwOnFindAvailableOffices = false;
    this.throwOnFindExpiredCalled = false;
  }
}
