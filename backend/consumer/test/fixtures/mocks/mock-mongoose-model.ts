import { PersistenceAppointmentData } from "../../../src/infrastructure/persistence/persistence-appointment.interface";

/** Shape of a persisted Mongoose document (includes _id injected by Mongo) */
interface MongoDoc extends PersistenceAppointmentData {
  _id: string;
}

/** Query filter / update payload — loose but typed bag-of-values */
type MongoFilter = Record<string, unknown>;

/**
 * MockMongooseModel: Simulates Mongoose model for testing Repository.
 * Enables testing without real MongoDB connection.
 */
export class MockMongooseModel {
  findResult: MongoDoc[] = [];
  findByIdResult: MongoDoc | null = null;
  saveCalls: MongoDoc[] = [];
  updateCalls: { filter: MongoFilter; update: MongoFilter }[] = [];
  deleteByIdCalls: string[] = [];
  throwOnSave = false;
  throwOnFind = false;
  throwOnUpdate = false;

  setFindResult(docs: MongoDoc[]) {
    this.findResult = docs;
  }

  setFindByIdResult(doc: MongoDoc | null) {
    this.findByIdResult = doc;
  }

  find(_filter?: MongoFilter) {
    return this;
  }

  findById(_id: string) {
    return this;
  }

  async exec() {
    if (this.throwOnFind) {
      throw new Error("Find operation failed");
    }
    return this.findResult;
  }

  async save(doc: MongoDoc) {
    if (this.throwOnSave) {
      throw new Error("Save operation failed");
    }
    this.saveCalls.push(doc);
    return { ...doc, _id: Math.random().toString() };
  }

  async updateOne(filter: MongoFilter, update: MongoFilter) {
    if (this.throwOnUpdate) {
      throw new Error("Update operation failed");
    }
    this.updateCalls.push({ filter, update });
    return { modifiedCount: 1 };
  }

  async deleteById(id: string) {
    this.deleteByIdCalls.push(id);
    return { deletedCount: 1 };
  }

  reset() {
    this.findResult = [];
    this.findByIdResult = null;
    this.saveCalls = [];
    this.updateCalls = [];
    this.deleteByIdCalls = [];
    this.throwOnSave = false;
    this.throwOnFind = false;
    this.throwOnUpdate = false;
  }
}
