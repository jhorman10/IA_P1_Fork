import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { OfficeDetailView, OfficeView } from "../../domain/models/office-view";
import {
  AdjustCapacityCommand,
  AdjustCapacityResult,
  OfficeServicePort,
} from "../../domain/ports/inbound/office-service.port";
import { OfficeRepository } from "../../domain/ports/outbound/office.repository";
import { Doctor, DoctorDocument } from "../../schemas/doctor.schema";

/**
 * Application Use Case: Office Service
 * SPEC-016: Lógica de negocio para el catálogo administrable de consultorios.
 *
 * Responsabilidades:
 * - Listar consultorios con metadatos operativos derivados (occupied, canDisable).
 * - Ampliar capacidad de forma secuencial e idempotente.
 * - Habilitar/deshabilitar consultorios con bloqueo si están ocupados.
 * - Semilla inicial 1..5 al primer arranque si la colección está vacía.
 *
 * Nota sobre ocupación: se consulta directamente la colección doctors para evitar
 * dependencia circular con DoctorModule (patrón adoptado en SpecialtiesModule).
 */
@Injectable()
export class OfficeServiceImpl
  implements OfficeServicePort, OnApplicationBootstrap
{
  private readonly logger = new Logger(OfficeServiceImpl.name);

  constructor(
    @Inject("OfficeRepository")
    private readonly officeRepo: OfficeRepository,
    @InjectModel(Doctor.name)
    private readonly doctorModel: Model<DoctorDocument>,
  ) {}

  /** SPEC-016: Seed inicial — crea consultorios 1..5 si la colección está vacía. */
  async onApplicationBootstrap(): Promise<void> {
    await this.seedIfEmpty();
  }

  async seedIfEmpty(): Promise<void> {
    const max = await this.officeRepo.findMaxNumber();
    if (max === 0) {
      this.logger.log(
        "Colección offices vacía — seeding consultorios 1..5",
        OfficeServiceImpl.name,
      );
      await this.officeRepo.createMany(["1", "2", "3", "4", "5"]);
    }
  }

  /** GET /offices — Lista completa con metadatos operativos derivados. */
  async getAll(): Promise<OfficeDetailView[]> {
    const [offices, activeDoctors] = await Promise.all([
      this.officeRepo.findAll(),
      this.doctorModel
        .find(
          { status: { $in: ["available", "busy"] }, office: { $ne: null } },
          { _id: 1, name: 1, office: 1, status: 1 },
        )
        .exec(),
    ]);

    const occupancyMap = new Map<
      string,
      { id: string; name: string; status: string }
    >();
    for (const doc of activeDoctors) {
      if (doc.office) {
        occupancyMap.set(doc.office, {
          id: (doc._id as { toString(): string }).toString(),
          name: doc.name,
          status: doc.status,
        });
      }
    }

    return offices
      .sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10))
      .map((office) => {
        const occupant = occupancyMap.get(office.number);
        const occupied = !!occupant;
        return {
          ...office,
          occupied,
          occupiedByDoctorId: occupant?.id ?? null,
          occupiedByDoctorName: occupant?.name ?? null,
          occupiedByStatus: occupant?.status ?? null,
          canDisable: office.enabled && !occupied,
        };
      });
  }

  /** PATCH /offices/capacity — Ajuste idempotente de capacidad objetivo. */
  async adjustCapacity(
    command: AdjustCapacityCommand,
  ): Promise<AdjustCapacityResult> {
    const { targetTotal } = command;

    if (!Number.isInteger(targetTotal) || targetTotal < 1) {
      throw new BadRequestException("target_total debe ser un entero positivo");
    }

    const currentMax = await this.officeRepo.findMaxNumber();

    if (targetTotal < currentMax) {
      throw new BadRequestException(
        "La reducción de capacidad se realiza deshabilitando consultorios",
      );
    }

    if (targetTotal === currentMax) {
      return { targetTotal, createdOffices: [], unchanged: true };
    }

    // Create offices (currentMax+1) .. targetTotal
    const newNumbers: string[] = [];
    for (let n = currentMax + 1; n <= targetTotal; n++) {
      newNumbers.push(String(n));
    }

    await this.officeRepo.createMany(newNumbers);
    this.logger.log(
      `Capacidad ampliada: nuevos consultorios ${newNumbers.join(", ")}`,
      OfficeServiceImpl.name,
    );

    return { targetTotal, createdOffices: newNumbers, unchanged: false };
  }

  /** PATCH /offices/:number — Habilita o deshabilita un consultorio. */
  async updateEnabled(
    number: string,
    enabled: boolean,
  ): Promise<OfficeDetailView> {
    const existing = await this.officeRepo.findByNumber(number);
    if (!existing) {
      throw new NotFoundException(`Consultorio ${number} no encontrado`);
    }

    if (!enabled) {
      // SPEC-016 Regla 6: bloquear si está ocupado por doctor active/busy
      const occupant = await this.doctorModel
        .findOne({
          office: number,
          status: { $in: ["available", "busy"] },
        })
        .exec();

      if (occupant) {
        throw new ConflictException(
          "No se puede deshabilitar: el consultorio está ocupado",
        );
      }
    }

    const updated = await this.officeRepo.updateEnabled(number, enabled);
    if (!updated) {
      throw new NotFoundException(`Consultorio ${number} no encontrado`);
    }

    // Build detail view - after update the office is no longer occupied (we verified above)
    return {
      ...updated,
      occupied: false,
      occupiedByDoctorId: null,
      occupiedByDoctorName: null,
      occupiedByStatus: null,
      canDisable: updated.enabled && false, // just updated, no occupant
    };
  }

  /** Internal: enabled office numbers para DoctorServiceImpl. */
  async getEnabledNumbers(): Promise<string[]> {
    return this.officeRepo.findEnabledNumbers();
  }

  /** Internal: single office lookup for validation in DoctorServiceImpl. */
  async findByNumber(number: string): Promise<OfficeView | null> {
    return this.officeRepo.findByNumber(number);
  }
}
