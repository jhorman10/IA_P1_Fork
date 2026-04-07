import { Appointment } from "@/domain/Appointment";

export interface OperationalRealTimePort {
  connect(token: string): void;
  disconnect(): void;
  onSnapshot(callback: (appointments: Appointment[]) => void): void;
  onAppointmentUpdated(callback: (appointment: Appointment) => void): void;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  onAuthRejected(callback: () => void): void;
  isConnected(): boolean;
}
