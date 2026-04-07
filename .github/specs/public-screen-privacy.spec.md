---
id: SPEC-009
status: IMPLEMENTED
feature: public-screen-privacy
created: 2026-04-05
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs:
  - SPEC-003
  - SPEC-004
---

# Spec: Anonimización de Datos en Pantalla Pública

> **Estado:** `IMPLEMENTED` → anonimización pública validada y dashboard autenticado preserva nombre completo.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

La pantalla pública de turnos (`/`) muestra `fullName` completo del paciente sin autenticación. Esto es un riesgo de privacidad documentado como riesgo alto (R-004) en el QA de SPEC-004. Esta spec define la anonimización del nombre en la pantalla pública y la conservación del nombre completo solo para usuarios autenticados con rol operativo.

### Requerimiento de Negocio

El refinamiento de SPEC-004 y la matriz de riesgos identificaron que la pantalla pública expone nombres completos de pacientes sin auth, violando principios de minimización de datos personales. El negocio necesita mantener la pantalla pública funcional como sala de espera, pero sin exponer nombres completos a visitantes no autenticados.

### Historias de Usuario

#### HU-01: Anonimización de nombres en pantalla pública

```
Como:        Responsable de privacidad del sistema
Quiero:      Que la pantalla pública muestre nombres parcialmente anonimizados
Para:        Que los pacientes puedan identificar su turno sin exponer su nombre completo a extraños

Prioridad:   Alta
Estimación:  S (Small — 3-5 pts)
Dependencias: SPEC-003 (appointment display)
Capa:        Frontend + Backend (opcional)
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Nombre parcial en pantalla pública
  Dado que:  un paciente "Juan Carlos Pérez López" tiene turno en espera
  Cuando:    la pantalla pública muestra su turno en /
  Entonces:  el nombre visible es "Juan C. P. L." (primer nombre + iniciales)
  Y          el paciente puede reconocer su turno sin que extraños lean su nombre completo
```

```gherkin
CRITERIO-1.2: Nombre completo visible para roles operativos
  Dado que:  un admin o recepcionista autenticado ve el dashboard
  Cuando:    consulta la lista de turnos
  Entonces:  ve el nombre completo "Juan Carlos Pérez López"
  Y          puede identificar al paciente sin ambigüedad
```

**Edge Case**

```gherkin
CRITERIO-1.3: Nombre de un solo término
  Dado que:  un paciente tiene nombre "María"
  Cuando:    la pantalla pública muestra su turno
  Entonces:  muestra "María" (sin truncar nombres de un solo término)
```

```gherkin
CRITERIO-1.4: Nombre con dos términos
  Dado que:  un paciente tiene nombre "Ana García"
  Cuando:    la pantalla pública muestra su turno
  Entonces:  muestra "Ana G." (primer nombre + inicial del segundo)
```

### Reglas de Negocio

1. La pantalla pública (`/`) SIEMPRE muestra nombres anonimizados.
2. El formato de anonimización es: primer nombre completo + iniciales de los demás términos seguidas de punto.
3. Las pantallas autenticadas (`/registration`, `/admin/profiles`, `/doctor/dashboard`) muestran el nombre completo.
4. El WebSocket sigue enviando el `fullName` completo; la anonimización es responsabilidad del frontend en la capa de presentación.
5. Se prefiere anonimización en frontend (no en backend) para no romper contratos de API existentes.

---

## 2. DISEÑO

### Modelos de Datos

Sin cambios en modelos de backend ni schemas MongoDB. El campo `fullName` sigue almacenándose y transmitiéndose completo.

### API Endpoints

Sin cambios en endpoints. La anonimización es exclusivamente frontend.

### Diseño Frontend

#### Función utilitaria

| Función                                   | Archivo                | Descripción                                           |
| ----------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `anonymizeName(fullName: string): string` | `lib/anonymizeName.ts` | Convierte "Juan Carlos Pérez López" → "Juan C. P. L." |

**Lógica:**

```typescript
export function anonymizeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName.trim();
  const [first, ...rest] = parts;
  const initials = rest.map((p) => `${p[0].toUpperCase()}.`).join(" ");
  return `${first} ${initials}`;
}
```

#### Componentes afectados

| Componente                 | Archivo                                                        | Cambio                                     |
| -------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| `CalledAppointmentCard`    | `components/AppointmentCard/CalledAppointmentCard.tsx`         | Usar `anonymizeName(appointment.fullName)` |
| `WaitingAppointmentCard`   | `components/AppointmentCard/WaitingAppointmentCard.tsx`        | Usar `anonymizeName(appointment.fullName)` |
| `CompletedAppointmentCard` | `components/AppointmentCard/CompletedAppointmentCard.tsx`      | Usar `anonymizeName(appointment.fullName)` |
| `AppointmentCard`          | `components/AppointmentCard/AppointmentCard.tsx`               | Usar `anonymizeName(appointment.fullName)` |
| `AssignmentNotification`   | `components/AssignmentNotification/AssignmentNotification.tsx` | Usar `anonymizeName(appointment.fullName)` |

**Regla de aplicación:** los 4 componentes de `AppointmentCard` y la notificación de asignación se usan exclusivamente en la pantalla pública (`/`). Si en el futuro se reutilizan en pantallas autenticadas, el componente deberá recibir una prop `anonymize?: boolean` para conmutar.

#### Alternativa con prop conmutable (recomendada para extensibilidad)

Si se prefiere que los componentes sean reutilizables en pantallas autenticadas:

```tsx
// En cada AppointmentCard
interface Props {
  appointment: Appointment;
  anonymize?: boolean; // default true en pantalla pública
}

// Uso
<span className={styles.nombre}>
  {anonymize ? anonymizeName(appointment.fullName) : appointment.fullName}
</span>;
```

La pantalla pública pasa `anonymize={true}` (o lo deja por defecto). Las pantallas autenticadas futuras pasan `anonymize={false}`.

### Notas de Implementación

- No se necesita instalar dependencias.
- No se modifica backend ni WebSocket.
- La función `anonymizeName` debe manejar strings vacíos y whitespace sin crash.
- Se recomienda la variante con prop `anonymize` para no crear deuda técnica en reutilización de componentes.

---

## 3. LISTA DE TAREAS

### Backend

No hay tareas backend.

### Frontend

#### Implementación

- [x] Crear `lib/anonymizeName.ts` con la función utilitaria
- [x] Actualizar `CalledAppointmentCard` — usar `anonymizeName` o prop `anonymize`
- [x] Actualizar `WaitingAppointmentCard` — idem
- [x] Actualizar `CompletedAppointmentCard` — idem
- [x] Actualizar `AppointmentCard` — idem
- [x] Actualizar `AssignmentNotification` — idem

#### Tests Frontend

- [x] Test `anonymizeName` — nombre completo, un término, dos términos, string vacío, whitespace extra
- [x] Test `WaitingAppointmentCard` — verifica que muestra nombre anonimizado por defecto
- [x] Test `CalledAppointmentCard` — idem
- [x] Test visual en pantalla pública — nombres parciales visibles
