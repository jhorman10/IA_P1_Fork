import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { OfficeReadRepository } from "../../domain/ports/outbound/office.repository";
import { Office, OfficeDocument } from "../../schemas/office.schema";

/**
 * Adapter: Infrastructure — Mongoose implementation of OfficeReadRepository (Consumer).
 * SPEC-016: Solo lectura de la colección `offices` para filtrar doctores elegibles.
 */
@Injectable()
export class MongooseOfficeRepository implements OfficeReadRepository {
  constructor(
    @InjectModel(Office.name)
    private readonly model: Model<OfficeDocument>,
  ) {}

  async findEnabledNumbers(): Promise<Set<string>> {
    const docs = await this.model.find({ enabled: true }, { number: 1 }).exec();
    return new Set(docs.map((d) => d.number));
  }
}
