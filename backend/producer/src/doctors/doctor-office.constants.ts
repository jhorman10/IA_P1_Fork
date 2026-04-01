export const VALID_DOCTOR_OFFICES = ["1", "2", "3", "4", "5"] as const;

export const DOCTOR_OFFICE_RANGE_MESSAGE =
  "El consultorio debe estar entre 1 y 5";

export function isValidDoctorOffice(office: string): boolean {
  return VALID_DOCTOR_OFFICES.includes(
    office as (typeof VALID_DOCTOR_OFFICES)[number],
  );
}
