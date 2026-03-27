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

## Fuentes Rectoras 2026

> A continuación, se detallan las fuentes y enlaces específicos que fundamentan cada sección de la guía de diseño para 2026. Esta estructura se basa en la convergencia de la arquitectura tradicional con las nuevas demandas de inteligencia artificial, seguridad Zero Trust y observabilidad.

| Sección de la guía                                  | Fuente                                                                                            | Enlace                                                                                                                                                                   | Fundamento aplicado                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Metadatos y Resumen**                          | 2026 Playbook for Software Development — LLMs' Roadmap (Artezio)                                  | https://www.artezio.com/pressroom/blog/playbook-development-languages/                                                                                                   | Esta sección responde a la necesidad de trazabilidad y procedencia de los cambios en el código, especialmente cuando intervienen modelos de IA. En 2026, los registros de decisiones y los metadatos del modelo son requisitos de gobernanza críticos para auditorías. |
| **2. Definición del Problema y Objetivos**          | The Complete Guide to System Design in 2026 (Fahim ul Haq / Educative)                            | https://dev.to/fahimulhaq/complete-guide-to-system-design-oc7                                                                                                            | La guía se apoya en la separación entre requerimientos funcionales y no funcionales, además del uso de metas S.M.A.R.T. para reducir retrabajo y ambigüedad en especificaciones asistidas por IA.                                                                      |
| **3. Diseño Arquitectónico (Modelo C4)**            | Strategic Software Architecture in 2026 y The C4 Model for Software Architecture                  | https://medium.com/@kiana.proudmoore/from-confusion-to-clarity-how-the-c4-model-can-transform-your-software-architecture-diagrams-7dcb8a972fc2                           | El Modelo C4 funciona como estándar de documentación en 2026 para comunicar arquitectura con claridad a distintos niveles de stakeholders, desde contexto de negocio hasta código.                                                                                     |
| **4. Estrategia de Tecnología y Datos**             | Modular Monolith: 42% Ditch Microservices (byteiota) y Vector Database Comparison 2026 (Reintech) | https://byteiota.com/modular-monolith-42-ditch-microservices-in-2026/<br>https://reintech.io/blog/vector-database-comparison-2026-pinecone-weaviate-milvus-qdrant-chroma | Esta sección incorpora dos hallazgos clave: el retorno al monolito modular para optimizar costos operativos y la adopción de bases de datos vectoriales como componente obligatorio para búsqueda semántica y RAG.                                                     |
| **5. Seguridad y Cumplimiento (Zero Trust)**        | 7 Pillars of Zero Trust in 2026: Complete NIST Guide (Trevonix)                                   | https://trevonix.com/blogs/7-pillars-of-zero-trust/                                                                                                                      | La seguridad se define desde el principio de “nunca confiar, siempre verificar”, con énfasis en microsegmentación, identidad fuerte y validación continua para infraestructuras críticas.                                                                              |
| **6. Observabilidad y Operaciones**                 | Kubernetes Trends 2026: Tools, Alternatives and Evolutions (SFEIR Institute)                      | https://institute.sfeir.com/en/kubernetes-training/trends-kubernetes-2026-tools-alternatives-evolutions/                                                                 | Esta parte sustenta la evolución operativa hacia orquestación preparada para IA, uso de GPUs con Kueue e instrumentación avanzada con OpenTelemetry para medir latencia de modelos e índices de error.                                                                 |
| **7. Registro de Decisiones Arquitectónicas (ADR)** | Architecture Decision Records (ADR): A Practical Template                                         | https://medium.com/@janmaleky/architecture-decision-records-adr-a-practical-template-for-system-design-exams-cd216bf275e8                                                | El foco está en documentar el porqué de las decisiones y sus trade-offs, más que el cómo. Esto evita repetir debates técnicos y mejora la gobernanza del sistema a largo plazo.                                                                                        |

## Guía de Documento de Diseño 2026

> Esta es una estructura genérica de un documento de diseño alineado con estándares de ingeniería de 2026. Se presenta con ejemplos técnicos transversales para que pueda reutilizarse en distintos tipos de sistema, no solo en este caso de uso.

### 1. Metadatos y Resumen

- **Título:** Nombre de la funcionalidad, servicio o sistema.
- **Autores / Participantes:** Lista de ingenieros, responsables de producto, seguridad, plataforma y stakeholders relevantes.
- **Estado:** Borrador, En Revisión o Aprobado.
- **Resumen:** Breve descripción técnica del cambio, su alcance y el impacto esperado en el sistema.

### 2. Definición del Problema y Objetivos

- **Contexto del problema:** Explica la limitación técnica actual. Ejemplo: alta latencia en procesamiento de eventos, baja resiliencia o inconsistencia en datos distribuidos.
- **Metas (S.M.A.R.T.):** Define resultados medibles. Ejemplo: reducir el tiempo de respuesta en un 30% o incorporar un esquema Zero Trust verificable.
- **No-objetivos:** Delimita explícitamente lo que no se resolverá en esta fase para controlar el alcance.

### 3. Diseño Arquitectónico (Modelo C4)

> Se utiliza el Modelo C4 para ofrecer vistas jerárquicas que reduzcan la ambigüedad y mejoren la comunicación entre perfiles técnicos y no técnicos.

- **Nivel 1 — Contexto:** Describe cómo interactúa el sistema con usuarios, proveedores externos y otros sistemas.
- **Nivel 2 — Contenedores:** Desglosa aplicaciones web, servicios backend, colas, bases de datos y servicios auxiliares. Ejemplo: un backend en Go conectado a PostgreSQL.
- **Nivel 3 — Componentes:** Expone módulos internos relevantes. Ejemplo: motor de reglas de priorización, pipeline de ingesta o capa de orquestación.

### 4. Estrategia de Tecnología y Datos

- **Estilo arquitectónico:** Justifica si conviene un Monolito Modular o Microservicios según tamaño del equipo, complejidad y necesidad de escalado independiente.
- **Almacenamiento:** Selecciona la persistencia según tipo de dato. Ejemplo: bases vectoriales como Pinecone para búsqueda semántica o motores relacionales para integridad transaccional.
- **Comunicación:** Define protocolos y patrones de intercambio. Ejemplo: gRPC para baja latencia síncrona o Apache Kafka para flujos orientados a eventos.

### 5. Seguridad y Cumplimiento (Zero Trust)

> La seguridad debe definirse desde el diseño, no como una capa posterior.

- **Identidad:** MFA obligatorio, tokens de corta duración y validación continua.
- **Micro-segmentación:** Aislamiento de cargas para limitar el radio de impacto ante una brecha.
- **Cifrado:** Estándares mínimos para datos en tránsito y en reposo, como TLS 1.3 y AES-256.

### 6. Observabilidad y Operaciones

- **Métricas y trazabilidad:** Instrumentación con OpenTelemetry para registrar latencias, tasas de error y comportamiento entre servicios.
- **Infraestructura:** Estrategia operativa. Ejemplo: Kubernetes con Kueue para administrar cuotas de GPU en cargas de IA.
- **Plan de rollback:** Secuencia técnica para revertir cambios cuando los indicadores de salud superan umbrales definidos.

### 7. Registro de Decisiones Arquitectónicas (ADR)

> Aquí se documentan los trade-offs evaluados para que el sistema conserve memoria técnica y gobernanza a largo plazo.

- **Decisión:** Ejemplo: se elige Rust sobre Python para un módulo de criptografía.
- **Razón:** Ejemplo: seguridad de memoria en compilación y mayor rendimiento.
- **Compromiso:** Ejemplo: mayor tiempo de desarrollo inicial a cambio de más estabilidad operativa.

### 8. Consideraciones de IA (si aplica)

- **Pipeline RAG:** Arquitectura para recuperación y generación de contenido. Ejemplo: GraphRAG para razonamiento entre entidades complejas.
- **Orquestación de agentes:** Uso de Model Context Protocol (MCP) u otros mecanismos estandarizados para conectar agentes con herramientas externas.

### Síntesis editorial

La guía se apoya en una base documental coherente para 2026: Artezio aporta la capa de gobernanza y trazabilidad; Educative estructura la formulación del problema y los objetivos; C4 aporta el lenguaje visual para alinear stakeholders; byteiota y Reintech sustentan las decisiones de arquitectura y datos; Trevonix establece el marco Zero Trust; SFEIR refuerza la operación observable para cargas modernas; y la plantilla ADR consolida la memoria técnica del sistema.

En conjunto, estas fuentes convierten el changelog en un repositorio de evidencia para la toma de decisiones, no en un registro narrativo de implementación. Esa es la base metodológica de las gráficas que siguen.

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

---

## Seguimiento IA vs Humano — Checkpoint 1

- **Qué sugirió la IA:** modelar disponibilidad del médico con un booleano dentro de consultorio para simplificar el filtro.
- **Qué validó el humano en documentación oficial:** en DDD, el médico debe conservar ciclo de vida independiente para trazabilidad de estados y auditoría.
- **Decisión tomada:** mantener entidad `Doctor` separada con estado explícito de disponibilidad y consulta encapsulada en repositorio.
- **Trade-off:** se agrega complejidad de modelado inicial a cambio de menor acoplamiento y mayor capacidad de evolución.

---

[Unreleased]: https://github.com/jhorman10/IA_P1_Fork/compare/HEAD...HEAD

## Seguimiento IA vs Humano — Checkpoint 2

- **Qué sugirió la IA:** resolver la actualización de disponibilidad médica con endpoint REST síncrono directo.
- **Qué validó el humano en documentación oficial:** en arquitectura event-driven, los cambios críticos de estado se preservan mejor con eventos de dominio y colas resilientes.
- **Decisión tomada:** publicar cambios de disponibilidad vía evento y procesarlos asíncronamente en el consumer.
- **Trade-off:** aumenta la complejidad de observabilidad, pero mejora desacoplamiento y tolerancia a fallas.

---

## Documentacion para HU y HT

> Esta seccion incorpora fuentes de referencia para redactar Historias de Usuario (HU) y convertirlas en Historias Tecnicas (HT) sin perder trazabilidad de negocio.

### Fuentes recomendadas

- Scrum Manager - Historias de Usuario: https://www.scrummanager.com/files/historias_usuario_scrum_manager.pdf?utm_source=chatgpt.com
- Caroli - Historias de Usuario: https://caroli.org/es/historias-de-usuario/
- Atlassian - User Stories en Agile: https://www.atlassian.com/es/agile/project-management/user-stories?utm_source=chatgpt.com

### Como redactar una HU (estructura minima)

Plantilla:

> Como [rol], quiero [objetivo], para [beneficio de negocio].

Checklist minimo:

- Tiene un rol real del dominio (por ejemplo: Paciente, Recepcionista, Administrador).
- Expresa valor de negocio observable.
- Incluye criterios de aceptacion verificables.
- Es negociable y estimable.

### Ejemplo claro de HU (este proyecto)

**HU-01 - Asignacion valida por disponibilidad real**

> Como Paciente, quiero que mi turno se asigne solo a un medico disponible, para evitar esperas indefinidas por asignaciones invalidas.

Criterios de aceptacion:

- Dado un paciente en espera, cuando el scheduler ejecuta el ciclo, entonces solo asigna consultorios con medico en estado `available`.
- Dado que no hay medicos disponibles, cuando finaliza el ciclo, entonces el turno permanece en espera sin perder prioridad.
- Dado un turno asignado correctamente, cuando se confirma la asignacion, entonces se publica el evento `AppointmentAssigned`.

### Como redactar una HT (derivada de HU)

Plantilla:

> Como equipo tecnico, necesitamos [capacidad tecnica], para habilitar [HU o resultado de negocio].

Checklist minimo:

- Define componente y limite tecnico (API, cola, base de datos, websocket, seguridad).
- Establece condicion de exito medible (latencia, errores, retries, cobertura, etc.).
- Mantiene trazabilidad directa con una HU.

### Ejemplo claro de HT (derivada de HU-01)

**HT-01 - Consulta priorizada de pacientes y validacion de medico disponible**

> Como equipo tecnico, necesitamos implementar en el scheduler una consulta MongoDB con orden por urgencia y validacion de disponibilidad del medico, para habilitar la HU-01 de asignacion valida.

Criterios de aceptacion:

- La consulta selecciona pacientes por orden `urgency DESC, createdAt ASC`.
- El scheduler descarta consultorios cuyo medico no este en estado `available`.
- La asignacion valida dispara el evento `AppointmentAssigned` en RabbitMQ.
- Si falla la publicacion, se aplica politica de reintentos y enrutamiento a DLQ.
- Se emite traza con OpenTelemetry para el flujo completo de asignacion.

---

## Seguimiento IA vs Humano - Checkpoint 3

### Lo que dijo la IA

**HU-001: Registro de Pacientes con Nivel de Urgencia**

Como recepcionista o personal de admision,
quiero registrar un paciente nuevo con un nivel de urgencia (Alta / Media / Baja),
para asegurar que los casos criticos sean priorizados en la cola de asignacion y el medico disponible sea el adecuado segun la gravedad.

Criterios de aceptacion:

- El formulario de registro permite seleccionar urgencia desde un dropdown con 3 opciones: Alta, Media, Baja.
- La urgencia es obligatoria; el sistema no permite registrar sin seleccionarla.
- Se guarda el timestamp de registro exacto (con precision de milisegundos) para desempates FIFO.
- El paciente registrado aparece inmediatamente en la cola de espera visible en el backend.
- Se valida que los unicos valores permitidos para urgencia sean los tres definidos (validacion tanto en UI como en API).

### Humano

**HU-01**

Como recepcionista, quiero registrar un usuario con nivel de urgencia (Alta, Media, Baja), para que el sistema priorice la atencion segun criticidad clinica.

Criterios de aceptacion:

- Solo se permiten valores de urgencia del selector.
- Si falta urgencia, el registro no se guarda y muestra validacion.
- Al guardar, el turno queda en estado "esperando" con fecha del momento en que se registro.

### Lectura del contraste

- La version de la IA es mas detallada en canales y precision tecnica (UI/API, milisegundos, visibilidad inmediata en backend).
- La version humana es mas sintetica y centrada en valor funcional, con criterios minimos claros.
- Decision de documentacion: usar la redaccion humana como base y anexar los detalles tecnicos de la IA como criterios extendidos cuando la fase de implementacion lo requiera.

---

## Seguimiento IA vs Humano - Checkpoint 4

### Lo que dijo la IA

**HU-002: Visualizacion en Tiempo Real de Turno y Consultorio**

Como paciente en la sala de espera,
quiero ver en la pantalla de la sala mi turno actual, el consultorio asignado, el nombre del medico y mi posicion en la cola,
para reducir mi ansiedad, conocer a que consultorio dirigirme y entender cuanto tiempo aproximado falta para mi atencion.

Criterios de aceptacion:

- La pantalla de espera muestra: numero de turno, consultorio, nombre del medico, posicion actual en la cola.
- La informacion se actualiza en menos de 2 segundos tras cambios (latencia WebSocket <200ms).
- Si el paciente aun no ha sido asignado, muestra "En espera..." y su posicion en la fila.
- Si un cambio de consultorio o medico ocurre, la pantalla refleja el cambio sin refresco de pagina.
- Se valida que solo pacientes con turno activo puedan ver esta informacion.

### Humano

**HU-02**

Como usuario en una sala de espera, quiero ver en tiempo real mi posicion en la cola, para conocer mi progreso sin preguntar en recepcion.

Criterios de aceptacion:

- La pantalla muestra la posicion actual y el estado del turno.
- Cuando cambia la cola, la posicion actual se actualiza sin recargar la pantalla.
- Si se pierde conexion, la pantalla muestra estado de reconexion y ultimo dato conocido.

### Lectura del contraste

- La version de la IA amplia el alcance funcional incorporando consultorio, nombre del medico, restriccion de visibilidad y objetivos emocionales del paciente.
- La version humana recorta el alcance a la necesidad principal de negocio: conocer avance en la cola con una experiencia robusta ante perdida de conexion.
- Decision de documentacion: mantener la HU humana como historia base por ser mas pequeña e independiente, y tratar los detalles extra de la IA como extension futura o criterios tecnicos derivados.

---

## Seguimiento IA vs Humano - Checkpoint 5

### Lo que dijo la IA

**HU-003: Notificacion del Paciente sobre Asignacion Confirmada**

Como paciente,
quiero recibir una notificacion inmediata en pantalla cuando mi turno ha sido asignado a un medico disponible,
para confirmar que sere atendido por una persona que realmente esta presente en el consultorio.

Criterios de aceptacion:

- La notificacion llega al cliente en maximo 2 segundos tras la asignacion en el evento de RabbitMQ.
- La notificacion muestra: nombre del medico, consultorio asignado y hora estimada de llamada.
- El evento es entregado con garantia de al menos una vez (no se pierden notificaciones).
- Si la notificacion falla la primera vez, se reintenta hasta 3 veces via DLQ antes de ser desechada.
- Se registra un log de cada notificacion enviada (timestamp, paciente, medico) para auditoria.

### Humano

**HU-03 Notificacion de asignacion de medico**

Como paciente, quiero recibir una notificacion inmediata en la pantalla cuando mi turno sea asignado, para confirmar que sere atendido y saber a que consultorio dirigirme.

Criterios de aceptacion:

- Cuando el turno se asigna, el paciente recibe una notificacion en la pantalla en un tiempo maximo de 2 segundos.
- La notificacion muestra nombre del medico, consultorio asignado y hora estimada de llamada.
- Si el paciente no tiene asignacion, no se muestra notificacion de llamado.

### Lectura del contraste

- La version de la IA incorpora controles tecnicos de confiabilidad y auditoria (al menos una vez, reintentos con DLQ, logging), utiles para la futura HT.
- La version humana mantiene foco en valor directo al paciente y comportamiento observable en la interfaz.
- Decision de documentacion: conservar la historia humana como HU base (INVEST) y trasladar los mecanismos de entrega garantizada a la HT correspondiente.

---

## HT habilitadoras para las HU registradas

> Esta seccion define las Historias Tecnicas (HT) necesarias para hacer viables las HU documentadas (HU-01, HU-02 y HU-03), manteniendo trazabilidad funcional y alcance INVEST.

### Matriz de trazabilidad HU -> HT

- HU-01 (registro con urgencia) -> HT-01
- HU-02 (visualizacion en tiempo real) -> HT-02, HT-03
- HU-03 (notificacion de asignacion) -> HT-04, HT-05, HT-06

### HT-01 - Persistencia y validacion de urgencia

Como equipo tecnico, necesitamos persistir turnos con nivel de urgencia y fecha de registro validada, para habilitar HU-01.

Criterios de aceptacion:

- El modelo de datos admite solo `Alta`, `Media` o `Baja` para urgencia.
- El sistema rechaza registros sin urgencia valida.
- Al crear el turno, se guarda `created_at` en UTC.
- El turno queda en estado inicial `waiting`.

### HT-02 - Proyeccion de cola consultable

Como equipo tecnico, necesitamos una consulta de cola ordenada y consumible por interfaz, para habilitar HU-02.

Criterios de aceptacion:

- La consulta devuelve posicion actual del turno y su estado.
- El orden de salida respeta prioridad y desempate por `created_at`.
- Si el turno no esta activo, la respuesta retorna estado consistente de no disponible.

### HT-03 - Canal en tiempo real con reconexion

Como equipo tecnico, necesitamos un canal WebSocket resiliente para publicar cambios de cola, para habilitar HU-02.

Criterios de aceptacion:

- Los cambios se reflejan sin recargar pantalla.
- Si se pierde conexion, el cliente intenta reconectar automaticamente.
- Durante reconexion, se mantiene el ultimo dato conocido en pantalla.

### HT-04 - Motor de asignacion por urgencia y disponibilidad

Como equipo tecnico, necesitamos un proceso de asignacion que seleccione el siguiente turno por urgencia y FIFO, validando disponibilidad real del medico, para habilitar HU-03.

Criterios de aceptacion:

- La asignacion respeta prioridad: Alta > Media > Baja.
- En misma urgencia, se respeta FIFO por `created_at`.
- Solo se asignan medicos en estado `available`.
- Si no hay medico disponible, el turno permanece en `waiting`.

### HT-05 - Publicacion confiable de evento de asignacion

Como equipo tecnico, necesitamos publicar `AppointmentAssigned` con entrega confiable para habilitar HU-03.

Criterios de aceptacion:

- Toda asignacion valida publica un evento `AppointmentAssigned`.
- La entrega se garantiza al menos una vez.
- Si falla la entrega inicial, se aplican reintentos y enrutamiento a DLQ al superar el limite.

### HT-06 - Notificacion visible y auditable al paciente

Como equipo tecnico, necesitamos consumir el evento de asignacion y notificar al paciente en pantalla con auditoria, para habilitar HU-03.

Criterios de aceptacion:

- La notificacion muestra medico, consultorio y hora estimada.
- Si no existe asignacion, no se muestra notificacion de llamado.
- Cada notificacion emitida deja registro auditable con timestamp y referencias del turno.
- El tiempo extremo a extremo cumple el objetivo de 2 segundos en condiciones normales.

---

## Estimaciones Scrum Poker — Historias Tecnicas

> Escala Fibonacci utilizada: 1, 2, 3, 5, 8, 13.  
> Criterios transversales aplicados: complejidad tecnica, incertidumbre/riesgo funcional, dependencias entre componentes y esfuerzo de pruebas.

| HT    | Titulo                                            | Puntos | Criterio principal                                                                                                                    |
| ----- | ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| HT-01 | Persistencia y validacion de urgencia             | **3**  | Baja complejidad. Reglas claras, pocas dependencias. Pruebas de validacion de campo y estado inicial directas.                        |
| HT-02 | Proyeccion de cola consultable                    | **5**  | Complejidad media. Requiere ordenamiento por prioridad + FIFO, manejo de estado consistente y pruebas de consultas.                   |
| HT-03 | Canal en tiempo real con reconexion               | **8**  | Complejidad alta. Manejo de WebSocket, reconexion automatica, sincronizacion de ultimo estado conocido y pruebas de resiliencia.      |
| HT-04 | Motor de asignacion por urgencia y disponibilidad | **8**  | Logica critica de negocio. Multiples reglas de decision, riesgo de regresion funcional y cobertura de escenarios borde.               |
| HT-05 | Publicacion confiable de evento de asignacion     | **13** | Mayor complejidad del feature. Confiabilidad de entrega (al menos una vez), reintentos, DLQ, idempotencia y observabilidad operativa. |
| HT-06 | Notificacion visible y auditable al paciente      | **8**  | Integracion de consumo de evento + actualizacion UI + registro de auditoria + cumplimiento de latencia extremo a extremo (<2s).       |

**Total de puntos:** 45

### Propuesta de distribucion por sprint

| Sprint   | HTs incluidas       | Puntos |
| -------- | ------------------- | ------ |
| Sprint 1 | HT-01, HT-02, HT-03 | 16     |
| Sprint 2 | HT-04, HT-05, HT-06 | 29     |

> Nota: la distribucion asume una velocidad de equipo de entre 16 y 30 puntos por sprint. Ajustar segun capacidad historica del equipo.

### Propuesta de distribucion por sprint — Historias de Usuario

| Sprint   | HUs incluidas | Puntos HU |
| -------- | ------------- | --------- |
| Sprint 1 | —             | 0         |
| Sprint 2 | HU-01, HU-02  | 11        |
| Sprint 3 | HU-03         | 13        |

> Sprint 1 solo completa HTs habilitadoras. Las HUs no se pueden cerrar hasta que sus HTs dependientes esten verificadas.

---

## Estimaciones Scrum Poker — Historias de Usuario

> Escala Fibonacci utilizada: 1, 2, 3, 5, 8, 13.  
> Criterios transversales aplicados: complejidad tecnica, incertidumbre/riesgo funcional, dependencias entre HTs habilitadoras y esfuerzo de pruebas de aceptacion.  
> Principio: la estimacion de cada HU mide valor funcional observable, no la suma del esfuerzo tecnico de sus HTs. Una HU no se considera terminada hasta que todas sus HTs esten completas y verificadas.

| HU    | Titulo                                     | Puntos | Criterio principal                                                                                                                                                                                                                   |
| ----- | ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HU-01 | Registro de paciente con nivel de urgencia | **3**  | Una sola HT habilitadora, reglas de negocio simples, criterios de aceptacion verificables directamente en UI y API. Sin integracion asincrona.                                                                                       |
| HU-02 | Visualizacion en tiempo real de posicion   | **8**  | Dos HTs con dependencia secuencial. La complejidad sube por el canal WebSocket y la resiliencia ante desconexion, pero el valor de negocio es acotado y los criterios son observables.                                               |
| HU-03 | Notificacion de asignacion al paciente     | **13** | Tres HTs en el camino critico. Integra motor de asignacion, publicacion confiable de evento y notificacion auditable. Maxima complejidad de integracion, riesgo funcional alto y latencia extremo a extremo como condicion de exito. |

**Total de puntos HU:** 24

---

## Matriz de Dependencia HU → HT

> Construida a partir de los criterios de aceptacion de las HUs, las HTs habilitadoras, las dependencias tecnicas entre HTs y los componentes del sistema (Scheduler, RabbitMQ, WebSocket, MongoDB, Frontend).

### Dependencias entre HTs

Antes de leer la matriz HU → HT es necesario entender que las propias HTs tienen orden interno de ejecucion:

| HT    | Depende de   | Razon de la dependencia                                                                                 |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------- |
| HT-01 | —            | No tiene dependencias. Es la base del modelo de datos.                                                  |
| HT-02 | HT-01        | La proyeccion de cola requiere turnos con urgencia ya persistidos.                                      |
| HT-03 | HT-02        | El canal WebSocket solo es util si ya existe una consulta de cola que publicar.                         |
| HT-04 | HT-01        | El motor de asignacion consume turnos con urgencia validada y estado `waiting`.                         |
| HT-05 | HT-04        | Solo se publica `AppointmentAssigned` cuando existe una asignacion valida del motor.                    |
| HT-06 | HT-05, HT-03 | Consume el evento publicado por HT-05 y necesita el canal WebSocket de HT-03 para notificar al cliente. |

### Matriz HU → HT con detalle tecnico

| HU    | Criterio de aceptacion clave                                                        | HT habilitadora | Componente tecnico                                     | Puntos HT | Dependencia interna de la HT | Puntos HU |
| ----- | ----------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------ | --------- | ---------------------------- | --------- |
| HU-01 | Urgencia obligatoria (Alta/Media/Baja), timestamp UTC, estado inicial `waiting`     | HT-01           | Modelo MongoDB + validacion API                        | 3         | Sin dependencias             | **3**     |
| HU-02 | Posicion en cola visible, actualizacion sin recarga, ultimo dato ante desconexion   | HT-02           | Consulta MongoDB ordenada por urgencia + FIFO          | 5         | HT-01 completa               | **8**     |
|       |                                                                                     | HT-03           | WebSocket resiliente + logica de reconexion en cliente | 8         | HT-02 completa               |           |
| HU-03 | Asignacion solo a medico `available`, prioridad Alta>Media>Baja + FIFO              | HT-04           | Scheduler + repositorio de Doctor con estado           | 8         | HT-01 completa               | **13**    |
|       | Evento `AppointmentAssigned` publicado con entrega garantizada (at-least-once, DLQ) | HT-05           | RabbitMQ Producer + politica de reintentos + DLQ       | 13        | HT-04 completa               |           |
|       | Notificacion en <2s con medico, consultorio y hora; registro auditable              | HT-06           | Consumer + WebSocket + log de auditoria                | 8         | HT-05 + HT-03 completas      |           |

### Camino critico

```
HT-01 → HT-04 → HT-05 → HT-06
         ↑                  ↑
HT-01 → HT-02 → HT-03 ────┘
```

- **Ruta A (funcionalidad de asignacion):** HT-01 → HT-04 → HT-05 → HT-06
- **Ruta B (visualizacion en tiempo real):** HT-01 → HT-02 → HT-03
- **Convergencia:** HT-06 depende de ambas rutas. No puede cerrarse HU-03 sin que las dos rutas esten completas.

### Resumen consolidado por sprint

| Sprint   | HTs entregadas                     | HUs desbloqueadas | Puntos HT | Puntos HU |
| -------- | ---------------------------------- | ----------------- | --------- | --------- |
| Sprint 1 | HT-01, HT-02, HT-03                | —                 | 16        | 0         |
| Sprint 2 | HT-04, HT-05, HT-06 + HU-01, HU-02 | HU-01, HU-02      | 29        | 11        |
| Sprint 3 | — (verificacion E2E)               | HU-03             | 0         | 13        |

> HU-01 y HU-02 se pueden verificar en Sprint 2 porque sus HTs habilitadoras (HT-01, HT-02, HT-03) quedan listas en Sprint 1. HU-03 cierra en Sprint 3 una vez validado el flujo extremo a extremo con latencia <2s.

---
