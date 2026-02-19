import request from 'supertest';
import { MongoClient } from 'mongodb';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';
const MONGO_URL = process.env.E2E_MONGO_URL || 'mongodb://localhost:27017/appointments_db';

let mongo: MongoClient;

beforeAll(async () => {
  mongo = new MongoClient(MONGO_URL);
  await mongo.connect();
});

afterAll(async () => {
  await mongo.close();
});

beforeEach(async () => {
  // Limpia la colección antes de cada test
  await mongo.db().collection('appointments').deleteMany({});
});

export const utils = {
  api: request(API_URL),
  mongo,
};
