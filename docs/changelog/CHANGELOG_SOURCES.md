# CHANGELOG_SOURCES — Bitácora de Investigación IA vs Humano

> **Feature:** Sistema de asignación de médicos disponibles a pacientes  
> **Autor:** Jhorman Orozco  
> **Semana:** 6 — Vuelo | Taller: Ingeniería de Software Core  
> **Restricción activa:** Zero Code — Solo diseño arquitectónico e investigación.

---

> Este archivo es una bitácora de investigación que contrasta críticamente las fuentes y arquitecturas propuestas por la IA frente a la documentación oficial investigada por el humano.  
> El formato de versionado sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

---

## [Unreleased]

### Added

#### 🩺 Sistema de asignación de médicos disponibles a pacientes

**Historia de Usuario:**

> _Como paciente registrado en la plataforma, quiero que se me asigne únicamente a un médico que esté presente en su consultorio, para que mi turno sea atendido de forma efectiva y no quede en espera indefinida por una asignación inválida._

**Descripción:**  
Implementación de un mecanismo de asignación inteligente que valida la disponibilidad real del médico en el consultorio antes de asignar un paciente, reemplazando la asignación puramente aleatoria por una basada en disponibilidad activa.

---

**Problema identificado:**  
Actualmente, cuando un paciente se registra en la plataforma, el sistema asigna aleatoriamente un número de consultorio sin verificar si el médico asociado a ese consultorio se encuentra disponible. Esto genera:

- Asignaciones a consultorios vacíos o con médico ausente.
- Experiencia degradada del paciente (espera indefinida sin atención real).
- Imposibilidad de priorizar pacientes según urgencia clínica.
- Falta de trazabilidad sobre el estado del médico en el momento de la asignación.

---

**Flujo actual (problema):**

```mermaid
flowchart LR
    A([Paciente registrado<br/>Estado: Esperando]) --> B[Scheduler periódico<br/>Corre cada N ms]
    B --> C{¿Hay oficinas<br/>sin turno asignado?}
    C -- Sí --> D[🎲 Selección aleatoria<br/>de consultorio libre]
    D --> E[Asigna turno<br/>Sin validar médico]
    E --> F([✅ Turno asignado<br/>Consultorio X])
    C -- No --> G([⏳ Turno en espera<br/>hasta próximo ciclo])

    style D fill:#f44336,color:#fff
    style E fill:#FF9800,color:#fff
```

---

**Solución propuesta:**

Cuando un paciente saca su turno, el sistema ya no le asigna un consultorio al azar. Primero consulta cuáles consultorios están libres y luego verifica si el médico asignado a cada uno de ellos está disponible ese momento. Solo si el médico está presente, el turno se asigna a ese consultorio.

Si hay varios pacientes esperando al mismo tiempo, el sistema respeta el orden de urgencia: primero atiende los casos más críticos, luego los moderados y por último los de rutina. Cuando dos pacientes tienen la misma urgencia, se respeta el orden de llegada.

Si en ese momento ningún médico está disponible, el turno queda en lista de espera y el sistema vuelve a intentarlo en el siguiente ciclo de revisión, sin perder el lugar del paciente en la fila.

Una vez el turno es asignado, el paciente recibe una notificación inmediata en pantalla con el nombre del médico y el consultorio al que debe dirigirse. Esa notificación es una confirmación real: el médico ya está ahí, listo para atenderlo.

---

**Flujo propuesto (solución):**

```mermaid
flowchart TD
    A([Paciente registrado<br/>Estado: Esperando]) --> B[Scheduler periódico<br/>Corre cada N ms]

    B --> C[Consultar consultorios<br/>sin turno activo]
    C --> D{¿Hay consultorios<br/>libres?}
    D -- No --> E([⏳ Sin cambios<br/>Esperar próximo ciclo])

    D -- Sí --> F[Consultar lista de<br/>turnos en espera]
    F --> G{¿Hay pacientes<br/>en espera?}
    G -- No --> E

    G -- Sí --> H[Ordenar por prioridad<br/>Alta → Media → Baja<br/>+ FIFO por timestamp]

    H --> I[Validar disponibilidad<br/>del médico en consultorio]

    I --> J{¿Médico<br/>disponible?}

    J -- ❌ No disponible --> K[Marcar consultorio<br/>como no disponible<br/>Saltar al siguiente]
    K --> I

    J -- ✅ Disponible --> L[Asignar turno<br/>al consultorio con<br/>médico presente]

    L --> M[Calcular duración<br/>basada en tipo de consulta]
    M --> N[Publicar evento<br/>AppointmentAssigned<br/>a RabbitMQ]
    N --> O[Producer consume evento<br/>y emite WebSocket]
    O --> P([🏥 Paciente notificado<br/>en tiempo real])

    style I fill:#2196F3,color:#fff
    style J fill:#2196F3,color:#fff
    style L fill:#4CAF50,color:#fff
    style K fill:#FF9800,color:#fff
    style P fill:#4CAF50,color:#fff
```