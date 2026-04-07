import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OfficeDocument = HydratedDocument<Office>;

/**
 * SPEC-016: Schema Office (Consumer — solo lectura)
 * La colección `offices` es gestionada por el Producer.
 * El Consumer solo lee de esta colección para filtrar doctores elegibles.
 */
@Schema({ timestamps: true, collection: "offices" })
export class Office {
  @Prop({ required: true, unique: true })
  number!: string;

  @Prop({ required: true, default: true })
  enabled!: boolean;
}

export const OfficeSchema = SchemaFactory.createForClass(Office);
