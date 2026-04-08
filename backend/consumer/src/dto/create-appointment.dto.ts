import { IsIn, IsNotEmpty, IsNumber, IsString } from "class-validator";

import { AppointmentPriority } from "../types/appointment-event";

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsNumber()
  idCard!: number;

  @IsNotEmpty()
  @IsString()
  fullName!: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(["high", "medium", "low"])
  priority!: AppointmentPriority;
}
