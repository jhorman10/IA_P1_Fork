import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ProfileRole = "admin" | "recepcionista" | "doctor";
export type ProfileStatus = "active" | "inactive";

export type ProfileDocument = HydratedDocument<Profile>;

/**
 * SPEC-004: Schema Profile (Producer — escritura y lectura)
 * Perfil operativo del Usuario autenticado mediante Firebase Auth.
 * Colección: profiles
 *
 * Índices:
 *   - uid:   único — clave canónica del Usuario (Firebase UID)
 *   - email: único — unicidad por correo institucional
 *   - { role, status }: compuesto — filtros operativos frecuentes (GET /profiles)
 */
@Schema({ timestamps: true, collection: "profiles" })
export class Profile {
  /** Firebase UID — identificador canónico del Usuario. */
  @Prop({ required: true, unique: true, index: true, maxlength: 128 })
  uid!: string;

  /** Correo institucional — único en el sistema. */
  @Prop({ required: true, unique: true, index: true, maxlength: 254 })
  email!: string;

  /** Nombre visible en la interfaz. */
  @Prop({ required: true, maxlength: 100 })
  display_name!: string;

  /** Rol operativo. Solo valores canónicos definidos en la spec. */
  @Prop({
    required: true,
    enum: ["admin", "recepcionista", "doctor"] as ProfileRole[],
    index: true,
  })
  role!: ProfileRole;

  /** Estado del Perfil. Inactivo bloquea acceso aunque el token sea válido. */
  @Prop({
    required: true,
    enum: ["active", "inactive"] as ProfileStatus[],
    default: "active",
    index: true,
  })
  status!: ProfileStatus;

  /**
   * Referencia al Doctor vinculado — obligatoria cuando role = "doctor".
   * Almacena el _id de la colección doctors como string.
   * La validación de negocio (doctor_id requerido para rol doctor) es responsabilidad
   * de la capa de servicio, no del schema de Mongoose.
   */
  @Prop({ type: String, default: null })
  doctor_id!: string | null;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

/**
 * Índice compuesto para filtros operativos frecuentes:
 * listar perfiles por rol y/o estado en GET /profiles.
 */
ProfileSchema.index({ role: 1, status: 1 });
