import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn, IsPositive, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentPriority } from '../types/appointment-event';

export class CreateAppointmentDto {
    @ApiProperty({
        description: 'Patient ID card number',
        example: 123456789,
    })
    @IsNotEmpty({ message: 'La cédula es obligatoria' })
    @IsNumber({}, { message: 'La cédula debe ser un número' })
    @IsPositive({ message: 'La cédula debe ser positiva' })
    @Max(Number.MAX_SAFE_INTEGER, { message: 'Número de cédula inválido' })
    idCard!: number;

    @ApiProperty({
        description: 'Patient full name',
        example: 'John Doe',
    })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @IsString({ message: 'El nombre debe ser texto' })
    fullName!: string;

    @ApiPropertyOptional({
        description: 'Appointment priority',
        example: 'medium',
        enum: ['high', 'medium', 'low'],
        default: 'medium',
    })
    @IsOptional()
    @IsString()
    @IsIn(['high', 'medium', 'low'], { message: 'La prioridad debe ser alta, media o baja' })
    priority?: AppointmentPriority;
}
