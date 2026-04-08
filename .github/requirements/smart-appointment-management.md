# Requerimiento: Sistema Inteligente de Gestión de Turnos Médicos

## Estado: Propuesta de valor / Borrador

## Objetivo principal

Reemplazar la asignación aleatoria actual por un motor inteligente que garantice que los pacientes sean atendidos según su urgencia y solo por médicos que realmente estén en su consultorio.

## Problema actual

- Pacientes enviados a consultorios vacíos.
- Tiempos de espera indefinidos que frustran al paciente.
- Falta de atención prioritaria a casos realmente urgentes.
- Invisibilidad operativa: no sabemos en tiempo real qué médicos están atendiendo y cuáles no.

## Solución propuesta

Al registrarse, el sistema verifica exactamente qué médicos están activos y en qué consultorios. Si hay fila de espera, el sistema ordena a los pacientes respetando su urgencia y su orden de llegada. El paciente ve de inmediato en las pantallas a qué médico y consultorio fue asignado.

## Historias de Usuario

### HU-01 Registro de urgencia

**Como** recepcionista, **quiero** registrar un usuario con nivel de urgencia (Alta, Media, Baja), **para que** el sistema priorice la atención según criticidad clínica.

### HU-02 Visualización de posición

**Como** usuario en sala de espera, **quiero** ver en tiempo real mi posición en la cola, **para** conocer mi progreso sin preguntar en recepción.

### HU-03 Notificación de asignación de médico

**Como** paciente, **quiero** recibir una notificación inmediata en la pantalla cuando mi turno sea asignado, **para** confirmar que seré atendido y saber a qué consultorio dirigirme.

## Habilitadores Técnicos

- HT-01: Persistencia y validación de urgencia (3 pts)
- HT-02: Proyección de cola consultable (5 pts)
- HT-03: Canal en tiempo real con reconexión (8 pts)
- HT-04: Motor de asignación por urgencia y disponibilidad médica (8 pts)
- HT-05: Publicación confiable de evento de asignación (13 pts)
- HT-06: Notificación visible y auditable al paciente (8 pts)

## Decisiones estratégicas

- El médico es el protagonista, no el consultorio.
- Búsquedas inteligentes (query directo a DB).
- Notificaciones por eventos, no por polling.

## Fuera de alcance

- Rediseño visual completo.
- Diagnóstico clínico automatizado.
- Gestión de RRHH (vacaciones, nóminas).
- Selección manual de médico por el paciente.
