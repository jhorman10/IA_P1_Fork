import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { ProfileView } from "../../../domain/models/profile-view";
import {
  ProfileCreateInput,
  ProfileListFilter,
  ProfilePage,
  ProfileRepository,
  ProfileUpdateInput,
} from "../../../domain/ports/outbound/profile.repository";
import { Profile, ProfileDocument } from "../../../schemas/profile.schema";

/**
 * SPEC-004: Adapter — Mongoose implementation of ProfileRepository (Producer).
 * SRP: Solo responsable del acceso a datos de perfiles operativos.
 * Mapeo en línea: ProfileDocument → ProfileView (sin mapper separado).
 */
@Injectable()
export class MongooseProfileRepository implements ProfileRepository {
  constructor(
    @InjectModel(Profile.name)
    private readonly model: Model<ProfileDocument>,
  ) {}

  async findByUid(uid: string): Promise<ProfileView | null> {
    const doc = await this.model.findOne({ uid }).exec();
    return doc ? this.toView(doc) : null;
  }

  async findByEmail(email: string): Promise<ProfileView | null> {
    const doc = await this.model.findOne({ email }).exec();
    return doc ? this.toView(doc) : null;
  }

  async findAll(filter: ProfileListFilter): Promise<ProfilePage> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filter.role) query["role"] = filter.role;
    if (filter.status) query["status"] = filter.status;

    const [docs, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return {
      data: docs.map((doc) => this.toView(doc)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: ProfileCreateInput): Promise<ProfileView> {
    // Mongoose will throw a MongoServerError (code 11000) on duplicate uid or email.
    // The service layer is responsible for catching it and converting to HTTP 409.
    const doc = await this.model.create({
      uid: data.uid,
      email: data.email,
      display_name: data.display_name,
      role: data.role,
      doctor_id: data.doctor_id ?? null,
      status: "active",
    });
    return this.toView(doc);
  }

  async update(
    uid: string,
    data: ProfileUpdateInput,
  ): Promise<ProfileView | null> {
    const patch: Partial<ProfileDocument> = {};
    if (data.role !== undefined) patch.role = data.role;
    if (data.status !== undefined) patch.status = data.status;
    if (data.display_name !== undefined) patch.display_name = data.display_name;
    if (data.doctor_id !== undefined) patch.doctor_id = data.doctor_id;

    const doc = await this.model
      .findOneAndUpdate({ uid }, { $set: patch }, { new: true })
      .exec();
    return doc ? this.toView(doc) : null;
  }

  private toView(doc: ProfileDocument): ProfileView {
    return {
      uid: doc.uid,
      email: doc.email,
      display_name: doc.display_name,
      role: doc.role,
      status: doc.status,
      doctor_id: doc.doctor_id,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
