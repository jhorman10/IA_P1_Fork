import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { Doctor, DoctorSchema } from "../schemas/doctor.schema";
import { DoctorController } from "./doctor.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
  ],
  controllers: [DoctorController],
})
export class DoctorModule {}
