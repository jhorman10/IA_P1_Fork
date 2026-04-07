import { Doctor } from "../../entities/doctor.entity";
import { DoctorStatus } from "../../../schemas/doctor.schema";

export interface DoctorReadRepository {
  findAvailable(): Promise<Doctor[]>;
  findById(id: string): Promise<Doctor | null>;
  findAll(): Promise<Doctor[]>;
}

export interface DoctorWriteRepository {
  updateStatus(id: string, status: DoctorStatus): Promise<Doctor | null>;
}

export interface DoctorRepository
  extends DoctorReadRepository, DoctorWriteRepository {}
