import { ApiProperty } from '@nestjs/swagger';

export class CreateAppointmentResponseDto {
    @ApiProperty({ example: 'accepted', description: 'Status of the request' })
    status: string;

    @ApiProperty({ example: 'Asignación de turno en progreso', description: 'User-friendly message' })
    message: string;
}
