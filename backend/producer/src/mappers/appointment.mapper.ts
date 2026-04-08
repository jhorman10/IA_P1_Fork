import { AppointmentResponseDto } from "../dto/appointment-response.dto";
import { AppointmentEventPayload } from "../types/appointment-event";

export class AppointmentMapper {
  static toResponseDto(event: AppointmentEventPayload): AppointmentResponseDto {
    const dto: Partial<AppointmentResponseDto> & { doctorId?: string | null } = {
      id: event.id,
      fullName: event.fullName,
      idCard: event.idCard,
      office: event.office,
      status: event.status,
      priority: event.priority,
      timestamp: event.timestamp,
      completedAt: event.completedAt,
    };

    // Only include doctorId when the source event explicitly provides it
    if (Object.prototype.hasOwnProperty.call(event, "doctorId")) {
      dto.doctorId = event.doctorId ?? null;
    }

    return dto as AppointmentResponseDto;
  }

  static toResponseDtoList(
    events: AppointmentEventPayload[],
  ): AppointmentResponseDto[] {
    return events.map((event) => this.toResponseDto(event));
  }
}
