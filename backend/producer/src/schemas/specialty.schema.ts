import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SpecialtyDocument = HydratedDocument<Specialty>;

/**
 * SPEC-015: Catálogo editable de especialidades médicas.
 * Proveedor: Producer. No hay acceso de escritura desde el Consumer.
 * Índice único case-insensitive sobre `name` (definido post-factory con collation).
 */
@Schema({ timestamps: true, collection: "specialties" })
export class Specialty {
  @Prop({ required: true, maxlength: 100 })
  name!: string;
}

export const SpecialtySchema = SchemaFactory.createForClass(Specialty);

// SPEC-015: Unicidad case-insensitive (strength: 2 = primario + mayúsculas/minúsculas)
SpecialtySchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
