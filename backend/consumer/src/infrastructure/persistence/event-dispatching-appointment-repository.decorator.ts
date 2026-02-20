import { Appointment } from "../../domain/entities/appointment.entity";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { DomainEventBus } from "../../domain/ports/outbound/domain-event-bus.port";
import { IdCard } from "../../domain/value-objects/id-card.value-object";

/**
 * 🛰️ HUMAN CHECK - H-25 Fix: Automatic Event Dispatch
 * This decorator ensures that after saving an entity, its domain events
 * are automatically pulled and published, decoupling the Use Case from this concern.
 */
export class EventDispatchingAppointmentRepositoryDecorator implements AppointmentRepository {
  constructor(
    private readonly decoratee: AppointmentRepository,
    private readonly eventBus: DomainEventBus,
  ) {}

  async findWaiting(): Promise<Appointment[]> {
    return this.decoratee.findWaiting();
  }

  async findAvailableOffices(allOfficeIds: string[]): Promise<string[]> {
    return this.decoratee.findAvailableOffices(allOfficeIds);
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const saved = await this.decoratee.save(appointment);

    // 🎯 Automate Event Dispatching (SRP)
    const events = appointment.pullEvents();
    if (events.length > 0) {
      await this.eventBus.publish(events);
    }

    return saved;
  }

  async findById(id: string): Promise<Appointment | null> {
    return this.decoratee.findById(id);
  }

  async findByIdCardAndActive(idCard: IdCard): Promise<Appointment | null> {
    return this.decoratee.findByIdCardAndActive(idCard);
  }

  async findExpiredCalled(now: number): Promise<Appointment[]> {
    return this.decoratee.findExpiredCalled(now);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    return this.decoratee.updateStatus(id, status);
  }
}
