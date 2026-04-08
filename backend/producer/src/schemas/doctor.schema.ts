import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type DoctorStatus = "available" | "busy" | "offline";

export type DoctorDocument = HydratedDocument<Doctor>;

/**
 * SPEC-015 / SPEC-016: Schema Doctor (Producer — escritura y lectura)
 * El Producer gestiona el CRUD de médicos.
 * Colección compartida con el Consumer (solo lectura allá).
 * Índices: status (motor de asignación del Consumer), office (sparse para búsqueda de ocupación).
 * office es nullable: null cuando offline, se asigna dinámicamente en check-in.
 */
@Schema({ timestamps: true, collection: "doctors" })
export class Doctor {
  @Prop({ required: true, maxlength: 100 })
  name!: string;

  @Prop({ required: true, maxlength: 100 })
  specialty!: string;

  // SPEC-015/016: Consultorio asignado dinámicamente — null cuando offline
  @Prop({
    type: String,
    required: false,
    default: null,
    sparse: true,
  })
  office!: string | null;

  @Prop({
    required: true,
    enum: ["available", "busy", "offline"] as DoctorStatus[],
    default: "offline",
    index: true,
  })
  status!: DoctorStatus;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
