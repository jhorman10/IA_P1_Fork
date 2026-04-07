import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { OfficeView } from "../../../domain/models/office-view";
import { OfficeRepository } from "../../../domain/ports/outbound/office.repository";
import { Office, OfficeDocument } from "../../../schemas/office.schema";

/**
 * Adapter: Infrastructure — Mongoose implementation of OfficeRepository (Producer).
 * SPEC-016: Gestiona persistencia del catálogo de consultorios.
 * SRP: Solo responsable del acceso a datos de oficinas. Mapeo en línea.
 */
@Injectable()
export class MongooseOfficeRepository implements OfficeRepository {
  constructor(
    @InjectModel(Office.name)
    private readonly model: Model<OfficeDocument>,
  ) {}

  async findAll(): Promise<OfficeView[]> {
    const docs = await this.model.find().sort({ number: 1 }).exec();
    return docs.map((doc) => this.toView(doc));
  }

  async findByNumber(number: string): Promise<OfficeView | null> {
    const doc = await this.model.findOne({ number }).exec();
    return doc ? this.toView(doc) : null;
  }

  async findEnabledNumbers(): Promise<string[]> {
    const docs = await this.model
      .find({ enabled: true }, { number: 1 })
      .sort({ number: 1 })
      .exec();
    // Sort numerically to guarantee ascending order: "1", "2", ... "10"
    return docs
      .map((d) => d.number)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }

  async findMaxNumber(): Promise<number> {
    const docs = await this.model.find({}, { number: 1 }).exec();
    if (docs.length === 0) return 0;
    return Math.max(...docs.map((d) => parseInt(d.number, 10)));
  }

  async createMany(numbers: string[]): Promise<OfficeView[]> {
    const docs = await this.model.insertMany(
      numbers.map((n) => ({ number: n, enabled: true })),
    );
    return (docs as unknown as OfficeDocument[]).map((doc) => this.toView(doc));
  }

  async updateEnabled(
    number: string,
    enabled: boolean,
  ): Promise<OfficeView | null> {
    const doc = await this.model
      .findOneAndUpdate({ number }, { $set: { enabled } }, { new: true })
      .exec();
    return doc ? this.toView(doc) : null;
  }

  private toView(doc: OfficeDocument): OfficeView {
    return {
      number: doc.number,
      enabled: doc.enabled,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
