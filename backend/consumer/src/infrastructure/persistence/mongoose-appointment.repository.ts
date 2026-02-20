import { Injectable, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { Appointment } from "../../domain/entities/appointment.entity";
import {
  Appointment as AppointmentSchema,
  AppointmentDocument,
} from "../../schemas/appointment.schema";
import { IdCard } from "../../domain/value-objects/id-card.value-object";
import { AppointmentMapper } from "./appointment.mapper";
import { AppointmentQuerySpecification } from "../../domain/specifications/appointment-query.specification";
import { ConsultationPolicy } from "../../domain/policies/consultation.policy";
import { MongooseQueryBuilder } from "./mongoose-query.builder";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";

// Pattern: Adapter + Repository — Bridges Mongoose with the Domain Port
// ⚕️ HUMAN CHECK - DIP: Implementa el puerto de dominio usando Mongoose de infraestructura
// SRP: Delega mapeo a AppointmentMapper, lógica de query a Specification,
//      y LÓGICA DE NEGOCIO a ConsultationPolicy (corrección A-08: lógica de dominio extraída)

@Injectable()
export class MongooseAppointmentRepository implements AppointmentRepository {
  constructor(
    @InjectModel(AppointmentSchema.name)
    private readonly model: Model<AppointmentDocument>,
    private readonly consultationPolicy: ConsultationPolicy, // ⚕️ Inject domain policy
    @Inject("LoggerPort")
    private readonly logger: LoggerPort, // ⚕️ H-34: Logger para eliminar console.log
  ) {}

  async findWaiting(): Promise<Appointment[]> {
    const docs = await this.model
      .find({ status: "waiting" })
      .sort(AppointmentQuerySpecification.QUEUE_SORT_ORDER)
      .exec();
    this.logger.log(
      `[DEBUG] findWaiting() → ${docs.length} turnos encontrados`,
    );
    return docs.map((doc) => AppointmentMapper.toDomain(doc));
  }

  async findAvailableOffices(allOfficeIds: string[]): Promise<string[]> {
    const occupiedDocs = await this.model
      .find({ status: "called" })
      .select("office status")
      .lean()
      .exec();
    this.logger.log(
      `[DEBUG] findAvailableOffices() → ${occupiedDocs.length} oficinas ocupadas`,
    );

    // Build lightweight objects for the policy — only office/status needed
    // ⚕️ HUMAN CHECK - Evitar toDomain() completo en docs lean parciales (solo office+status seleccionados)
    const occupiedOffices = occupiedDocs
      .filter((d) => d.office && d.status === "called")
      .map((d) => d.office as string);

    // ⚕️ HUMAN CHECK - Lógica de negocio delegada a la política de dominio (corrección A-08)
    const libres = allOfficeIds.filter((id) => !occupiedOffices.includes(id));
    this.logger.log(
      `[DEBUG] findAvailableOffices() → oficinas libres: ${JSON.stringify(libres)}`,
    );
    return libres;
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const persistenceData = AppointmentMapper.toPersistence(appointment);

    // Use domainId for lookup (never appointment.id, which may be a new UUID)
    const domainId = appointment.id;
    const existing = await this.model.findOne({ domainId }).exec();
    if (!existing) {
      const created = await this.model.create(persistenceData);
      return AppointmentMapper.toDomain(created);
    }

    // Existing entity → update in place
    const updated = await this.model
      .findOneAndUpdate({ domainId }, persistenceData, {
        new: true,
        upsert: true,
      })
      .exec();
    return AppointmentMapper.toDomain(updated);
  }

  async findById(id: string): Promise<Appointment | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? AppointmentMapper.toDomain(doc) : null;
  }

  async findByIdCardAndActive(idCard: IdCard): Promise<Appointment | null> {
    const doc = await this.model
      .findOne({
        idCard: idCard.toValue(),
        ...MongooseQueryBuilder.buildActiveFilter(
          AppointmentQuerySpecification.ACTIVE_STATUSES,
        ),
      })
      .exec();
    return doc ? AppointmentMapper.toDomain(doc) : null;
  }

  async findExpiredCalled(now: number): Promise<Appointment[]> {
    const docs = await this.model
      .find(MongooseQueryBuilder.buildExpiredCalledFilter(now))
      .exec();
    return docs.map((doc) => AppointmentMapper.toDomain(doc));
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { status }).exec();
  }
}
