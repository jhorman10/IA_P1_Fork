import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { AppointmentPriority } from '../types/appointment-event';

export class CreateAppointmentDto {
    @IsNotEmpty()
    @IsNumber()
    idCard!: number;

    @IsNotEmpty()
    @IsString()
    fullName!: string;

    @IsOptional()
    @IsString()
    @IsIn(['high', 'medium', 'low'])
    priority?: AppointmentPriority;
}
