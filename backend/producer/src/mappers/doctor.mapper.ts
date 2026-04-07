import { DoctorResponseDto } from "../dto/doctor-response.dto";
import { DoctorView } from "../domain/models/doctor-view";

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
    } as unknown as DoctorResponseDto;
  }

  static toDtoList(views: DoctorView[]): DoctorResponseDto[] {
    return views.map((v) => this.toDto(v));
  }
}
