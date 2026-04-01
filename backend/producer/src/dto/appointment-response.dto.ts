import { ApiProperty } from "@nestjs/swagger";

export class AppointmentResponseDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "Unique identifier",
  })
  id!: string;

  @ApiProperty({ example: "John Doe", description: "Patient full name" })
  fullName!: string;

  @ApiProperty({ example: 123456789, description: "Patient ID card number" })
  idCard!: number;

  @ApiProperty({
    example: "3",
    nullable: true,
    description: "Assigned office number",
  })
  office!: string | null;

  @ApiProperty({
    enum: ["waiting", "called", "completed"],
    example: "waiting",
    description: "Current status",
  })
  status!: string;

  @ApiProperty({
    enum: ["high", "medium", "low"],
    example: "medium",
    description: "Priority level",
  })
  priority!: string;

  @ApiProperty({ example: 1710000000, description: "Creation timestamp" })
  timestamp!: number;

  @ApiProperty({
    required: false,
    example: 1710000500,
    description: "Completion timestamp",
  })
  completedAt?: number;

  @ApiProperty({
    nullable: true,
    example: "64b1c2d3e4f5a6b7c8d9e0f1",
    description: "Assigned doctor ID",
  })
  doctorId!: string | null;

  @ApiProperty({
    nullable: true,
    example: "Dr. Juan García",
    description: "Assigned doctor name",
  })
  doctorName!: string | null;
}
