import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

import { VALID_DOCTOR_OFFICES } from "../doctors/doctor-office.constants";

export type DoctorStatus = "available" | "busy" | "offline";

export type DoctorDocument = HydratedDocument<Doctor>;

/**
 * ⚕️ HUMAN CHECK - Schema Doctor (Producer — escritura y lectura)
 * El Producer gestiona el CRUD de médicos.
 * Colección compartida con el Consumer (solo lectura allá).
 * Índices: status (motor de asignación del Consumer), office (unicidad + búsqueda).
 */
@Schema({ timestamps: true, collection: "doctors" })
export class Doctor {
  @Prop({ required: true, maxlength: 100 })
  name!: string;

  @Prop({ required: true, maxlength: 100 })
  specialty!: string;

  // SPEC-003: Consultorio donde opera el médico — único por consultorio
  @Prop({
    required: true,
    unique: true,
    index: true,
    enum: VALID_DOCTOR_OFFICES,
  })
  office!: string;

  @Prop({
    required: true,
    enum: ["available", "busy", "offline"] as DoctorStatus[],
    default: "offline",
    index: true,
  })
  status!: DoctorStatus;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
