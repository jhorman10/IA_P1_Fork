import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OfficeDocument = HydratedDocument<Office>;

/**
 * SPEC-016: Schema Office (Producer — escritura y lectura)
 * Catálogo administrable de consultorios individuales.
 * Colección "offices" compartida con el Consumer (solo lectura allá).
 *
 * Índices:
 *   - number: unique — impede duplicados de numeración
 *   - { enabled, number }: apoyo para listados operativos ascendentes
 */
@Schema({ timestamps: true, collection: "offices" })
export class Office {
  /** Número estable del consultorio (regex /^[1-9][0-9]*$/). */
  @Prop({
    required: true,
    unique: true,
    match: /^[1-9][0-9]*$/,
    maxlength: 10,
  })
  number!: string;

  /** Indica si el consultorio está operativo para nuevos check-in. */
  @Prop({ required: true, default: true })
  enabled!: boolean;
}

export const OfficeSchema = SchemaFactory.createForClass(Office);

// SPEC-016: Índice compuesto de apoyo para consultas operativas ascendentes
OfficeSchema.index({ enabled: 1, number: 1 });
