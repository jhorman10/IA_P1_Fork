import { DoctorView } from "../domain/models/doctor-view";
import { DoctorResponseDto } from "../dto/doctor-response.dto";

export class DoctorMapper {
  static toDto(view: DoctorView): DoctorResponseDto {
    return {
      id: view.id,
      name: view.name,
      specialty: view.specialty,
      office: view.office,
      status: view.status,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
    };
  }

  static toDtoList(views: DoctorView[]): DoctorResponseDto[] {
    return views.map((v) => this.toDto(v));
  }
}
