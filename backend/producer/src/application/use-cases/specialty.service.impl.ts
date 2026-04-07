import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { SpecialtyView } from "../../domain/models/specialty-view";
import {
  CreateSpecialtyCommand,
  SPECIALTY_SERVICE_TOKEN,
  SpecialtyServicePort,
} from "../../domain/ports/inbound/specialty-service.port";
import { SpecialtyRepository } from "../../domain/ports/outbound/specialty.repository";

/**
 * Application Use Case: Specialty Service
 * SPEC-015: CRUD del catálogo de especialidades médicas con validaciones de negocio.
 * SRP: Orquesta exclusivamente el SpecialtyRepository. Sin acceso directo a MongoDB.
 */
@Injectable()
export class SpecialtyServiceImpl implements SpecialtyServicePort {
  constructor(
    @Inject("SpecialtyRepository")
    private readonly repo: SpecialtyRepository,
  ) {}

  async createSpecialty(
    command: CreateSpecialtyCommand,
  ): Promise<SpecialtyView> {
    const existing = await this.repo.findByName(command.name);
    if (existing) {
      throw new ConflictException("La especialidad ya existe");
    }
    return this.repo.save(command.name);
  }

  async findAll(): Promise<SpecialtyView[]> {
    return this.repo.findAll();
  }

  async findById(id: string): Promise<SpecialtyView> {
    const specialty = await this.repo.findById(id);
    if (!specialty) {
      throw new NotFoundException(`Especialidad con id ${id} no encontrada`);
    }
    return specialty;
  }

  async updateSpecialty(id: string, name: string): Promise<SpecialtyView> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Especialidad con id ${id} no encontrada`);
    }
    const duplicate = await this.repo.findByName(name);
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException("La especialidad ya existe");
    }
    const updated = await this.repo.update(id, name);
    if (!updated) {
      throw new NotFoundException(`Especialidad con id ${id} no encontrada`);
    }
    return updated;
  }

  async deleteSpecialty(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Especialidad con id ${id} no encontrada`);
    }
    const linkedCount = await this.repo.countDoctorsBySpecialtyId(id);
    if (linkedCount > 0) {
      throw new BadRequestException(
        "No se puede eliminar: hay doctores vinculados a esta especialidad",
      );
    }
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Especialidad con id ${id} no encontrada`);
    }
  }
}

export { SPECIALTY_SERVICE_TOKEN };
