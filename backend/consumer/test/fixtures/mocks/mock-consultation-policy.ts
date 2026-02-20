import { Appointment } from '../../../src/domain/entities/appointment.entity';

/**
 * MockConsultationPolicy: Simulates ConsultationPolicy for testing Repository delegation.
 */
export class MockConsultationPolicy {
    findAvailableOfficeCalls: Array<{
        allOffices: string[];
        occupied: Appointment[];
    }> = [];
    findAvailableResult: string[] = [];
    throwOnFindAvailable = false;

    canAssignCalls: Appointment[] = [];
    canAssignResult = true;
    throwOnCanAssign = false;

    isOfficeEligibleCalls: Array<{
        office: string;
        availableOffices: string[];
    }> = [];
    isOfficeEligibleResult = true;
    throwOnIsOfficeEligible = false;

    getRandomDurationCalls = 0;
    getRandomDurationResult = 10;

    setFindAvailableResult(result: string[]) {
        this.findAvailableResult = result;
    }

    setCanAssignResult(result: boolean) {
        this.canAssignResult = result;
    }

    setIsOfficeEligibleResult(result: boolean) {
        this.isOfficeEligibleResult = result;
    }

    setThrowOnFindAvailable(shouldThrow: boolean) {
        this.throwOnFindAvailable = shouldThrow;
    }

    setThrowOnCanAssign(shouldThrow: boolean) {
        this.throwOnCanAssign = shouldThrow;
    }

    setThrowOnIsOfficeEligible(shouldThrow: boolean) {
        this.throwOnIsOfficeEligible = shouldThrow;
    }

    findAvailableOffices(allOffices: string[], occupied: Appointment[]): string[] {
        if (this.throwOnFindAvailable) {
            throw new Error('FindAvailableOffices failed');
        }
        this.findAvailableOfficeCalls.push({ allOffices, occupied });
        return this.findAvailableResult;
    }

    canAssign(appointment: Appointment): boolean {
        if (this.throwOnCanAssign) {
            throw new Error('CanAssign failed');
        }
        this.canAssignCalls.push(appointment);
        return this.canAssignResult;
    }

    isOfficeEligible(office: string, availableOffices: string[]): boolean {
        if (this.throwOnIsOfficeEligible) {
            throw new Error('IsOfficeEligible failed');
        }
        this.isOfficeEligibleCalls.push({ office, availableOffices });
        return this.isOfficeEligibleResult;
    }

    getRandomDurationSeconds(): number {
        this.getRandomDurationCalls++;
        return this.getRandomDurationResult;
    }

    setGetRandomDurationResult(result: number) {
        this.getRandomDurationResult = result;
    }

    reset() {
        this.findAvailableOfficeCalls = [];
        this.findAvailableResult = [];
        this.throwOnFindAvailable = false;
        this.canAssignCalls = [];
        this.canAssignResult = true;
        this.throwOnCanAssign = false;
        this.isOfficeEligibleCalls = [];
        this.isOfficeEligibleResult = true;
        this.throwOnIsOfficeEligible = false;
        this.getRandomDurationCalls = 0;
        this.getRandomDurationResult = 10;
    }
}
