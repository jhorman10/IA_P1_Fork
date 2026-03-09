# ASD – Agentic Spec-Driven Development

**Desarrollo de Software Dirigido por Especificaciones y Ejecutado por Agentes.**

Marco Operativo de Ingeniería de Software Asistida por Inteligencia Artificial. Programa de transformación progresiva del modelo de ingeniería de Sofka hacia un esquema AI-native, gobernado y medible.

Operado sobre el motor **GAIDD** (Generative AI-Driven Development), orquesta agentes especializados de IA para validar, analizar e implementar requerimientos de software con coherencia, trazabilidad y calidad.

---

## Estructura

```
.github/
├── agents/          # 5 agentes especializados (.agent.md)
├── prompts/         # 9 prompts de entrada (.prompt.md)
├── skills/          # 14 habilidades reutilizables por dominio
├── docs/
│   ├── config/      # config.yaml — configuración del usuario
│   ├── lineamientos/ # Estándares dev, QA y generales
│   ├── context/     # Arquitectura, dominio, stack técnico, DoD, DoR
│   └── output/      # Reportes generados (por artefacto · organizados por {artifact_id})
├── INDEX.md         # Inventario completo con relaciones
└── HU-P001.md       # Ejemplo de Historia de Usuario
README.md            # Este archivo
```

---

## Inicio Rápido

### 1. Configura tu perfil

Edita [`.github/docs/config/config.yaml`](.github/docs/config/config.yaml):

```yaml
user_name: TuNombre
user_role: TuRol
seniority_level: Junior | Mid | Senior
communication_language: Español
document_output_language: Español
requirements_folder: "{project-root}/.github/docs/requirements"
output_folder: "{project-root}/.github/docs/output"
qa_output_folder: "{output_folder}/qa"
backend_output_folder: "{output_folder}/backend"
frontend_output_folder: "{output_folder}/frontend"
```

### 2. Ejecuta el pipeline completo

En el agente IA compatible, escribe:

```
/prompt_agent_full-flow
```

Luego pega tu Historia de Usuario o Requerimiento. El sistema clasifica, evalúa y genera el reporte automáticamente.

---

## Prompts Disponibles

| Prompt                                                  | Descripción                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `prompt_agent_full-flow`                                | **Recomendado.** Pipeline GAIDD completo → agente especializado |
| `prompt_agent_spec`                                     | Solo validación del requerimiento (pasos 0–3)                   |
| `prompt_agent_backend`                                  | Activa directamente el agente de backend                        |
| `prompt_agent_frontend`                                 | Activa directamente el agente de frontend                       |
| `prompt_agent_qa`                                       | Activa directamente el agente de QA                             |
| `prompt_agent_spec_gaidd.granularity-classifier`        | Paso 0 — Clasifica el artefacto (HU vs Req. Tradicional)        |
| `prompt_agent_spec_gaidd.requirement-validator`         | Paso 2 — Valida completitud y viabilidad técnica                |
| `prompt_agent_spec_gaidd.requirement-conflict-resolver` | Paso 2.1 — Resuelve conflictos y ambigüedades                   |
| `prompt_agent_spec_gaidd.requirement-analysis`          | Paso 3 — Análisis técnico del requerimiento                     |

---

## Pipeline GAIDD

```
Artefacto de entrada
       ↓
[Paso 0] Clasificación → HU o Req. Tradicional
       ↓
[Paso 0] Evaluación INVEST / IEEE 830
       ↓
[Paso 2] Validación de completitud y viabilidad
       ↓
[Paso 3] Análisis técnico (QUÉ / DÓNDE / POR QUÉ)
       ↓
Selección de agente especializado
(Backend / Frontend / QA)
       ↓
Generación en .github/docs/output/{agente}/
```

---

## Documentación Completa

Consulta el [Índice del Proyecto](.github/INDEX.md) para un inventario detallado de todos los agentes, prompts, skills y sus relaciones.
