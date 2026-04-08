import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type DoctorStatus = "available" | "busy" | "offline";

export type DoctorDocument = HydratedDocument<Doctor>;

/**
 * ⚕️ HUMAN CHECK - Schema Doctor (Consumer — solo lectura)
 * La colección `doctors` es gestionada por el Producer.
 * El Consumer solo lee de esta colección para el motor de asignación.
 * Índices: status (motor de asignación), office (búsqueda por consultorio).
 */
@Schema({ timestamps: true, collection: "doctors" })
export class Doctor {
  @Prop({ required: true, maxlength: 100 })
  name!: string;

  @Prop({ required: true, maxlength: 100 })
  specialty!: string;

  // SPEC-015/016: office es nullable — null cuando offline, asignado dinámicamente en check-in
  @Prop({ required: false, default: null, type: String })
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

// SPEC-003/015: Índice sparse por consultorio — excluye doctores offline (office null)
DoctorSchema.index({ office: 1 }, { sparse: true });
