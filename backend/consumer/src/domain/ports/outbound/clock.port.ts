/**
 * ⚕️ HUMAN CHECK - Puerto Clock: Proveedor abstracto de tiempo para lógica determinista.
 * Esencial para testear reglas dependientes del tiempo sin hacks de estado global.
 */
export interface ClockPort {
  now(): number;
  isoNow(): string;
}
