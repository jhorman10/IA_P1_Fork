import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn, IsPositive, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentPriority } from '../types/turno-event';

export class CreateAppointmentDto {
    @ApiProperty({
        description: 'Patient ID card number',
        example: 123456789,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    @Max(Number.MAX_SAFE_INTEGER)
    idCard: number;

    @ApiProperty({
        description: 'Patient full name',
        example: 'John Doe',
    })
    @IsNotEmpty()
    @IsString()
    fullName: string;

    @ApiPropertyOptional({
        description: 'Appointment priority',
        example: 'medium',
        enum: ['high', 'medium', 'low'],
        default: 'medium',
    })
    @IsOptional()
    @IsString()
    @IsIn(['high', 'medium', 'low'])
    priority?: AppointmentPriority;
}
