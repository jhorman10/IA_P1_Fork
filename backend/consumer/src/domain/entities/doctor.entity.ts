export type DoctorStatus = "available" | "busy" | "offline";

export class Doctor {
  constructor(
    public id: string,
    public name: string,
    public specialty: string,
    public office: string,
    public status: DoctorStatus,
  ) {}

  public markBusy(): void {
    this.status = "busy";
  }

  public markAvailable(): void {
    this.status = "available";
  }
}
