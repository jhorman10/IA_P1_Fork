import { AppointmentEventPayload } from '../types/appointment-event';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';

export class AppointmentMapper {
    static toResponseDto(event: AppointmentEventPayload): AppointmentResponseDto {
        return {
            id: event.id,
            fullName: event.fullName,
            idCard: event.idCard,
            office: event.office,
            status: event.status,
            priority: event.priority,
            timestamp: event.timestamp,
            completedAt: event.completedAt,
        };
    }

    static toResponseDtoList(events: AppointmentEventPayload[]): AppointmentResponseDto[] {
        return events.map(event => this.toResponseDto(event));
    }
}
