# Auditoria cruzada AI-First: Reservas Sofka

## Code review aumentado por IA - Evaluacion segun rubrica Sofka

**Fecha**: 13 de febrero de 2026  
**Equipo Auditor**: AI-Assisted Review Team (German Rojas & Antigravity)  
**Proyecto Auditado**: reservasSofka  
**Contexto Taller**: Microservicios con Producer/Consumer/Broker (RabbitMQ)

---

## Rama de auditoria (QA Review)

- **Rama (local):** `review/team-three-Qa`
- **Rama (remota):** `https://github.com/Duver0/IA_P1/tree/review/team-three-Qa`
- **PR hacia `develop`:** `https://github.com/Duver0/IA_P1/pull/17`

---

## Evidencia: Run & Break (docker compose)

**Objetivo:** Validar que el proyecto levanta correctamente con Docker y que los servicios se comunican sin intervención manual.

**Comandos ejecutados:**

- `docker compose up --build`
- (opcional) `docker compose ps`
- (opcional) `docker compose logs -f`

**Resultado:**

- El stack levanta correctamente.
- No se presentaron errores bloqueantes durante el arranque.
- El flujo funcional principal se puede ejecutar y el proyecto opera de acuerdo con el README.

**Notas QA:**

- Se recomienda mantener esta prueba como “smoke test” obligatorio antes de merge a `develop`.

---

## 1. Estrategia de documentacion tecnica - Opinion de Antigravity

**Calificación: 5 - Excelente**

La documentación técnica evaluada es detallada y estructurada. Cumple con varios criterios de una metodología de trabajo asistida:

- Define claramente los roles ("AI as Junior Developer", "Human as Architect").
- Establece un protocolo de interacción y revisión.
- Incluye la sección de "Sentinel Comments" explicando el uso de `// 🛡️ HUMAN CHECK`.
- Define dinámicas de interacción y CSS guidelines.
- Es un excelente ejemplo de documentación de procesos con IA.

## 1. Estrategia de documentacion tecnica - Opinion de German

**Calificación: 3 - Aceptable (Genérico, falta evidencia)**

La documentación evaluada **explica la intención** del enfoque de trabajo y lista etapas del proceso, pero actualmente se queda en un nivel **descriptivo** y **no auditable**: no demuestra con evidencia _cómo_ se aplicó realmente en este repo ni deja una guía replicable para otro equipo.

### Observaciones clave (QA)

- **Falta trazabilidad:** no incluye referencias a commits/PRs, decisiones verificables o ejemplos reales (ruta de archivo + snippet) que soporten lo descrito.
- **Prompts inexistentes o vagos:** no presenta prompts reales (ni variaciones), por lo que no se entiende la estrategia de interacción con IA ni cómo iteraron cuando falló.
- **HUMAN CHECK sin muestras:** menciona revisión humana, pero no evidencia “Sentinel Comments” reales (`// 🛡️ HUMAN CHECK`) ni criterios de aceptación aplicados.
  - El equipo sí aplicó la práctica, pero falló la documentación del proceso, que quedó incompleta o genérica.
- **“Lo que la IA hizo mal” sin método:** lista fallos típicos, pero no muestra el patrón de detección → fix → prevención (reglas, checklist, automatización).

### Recomendación mínima para cumplir rúbrica

1. **Sección “Prompts usados” (5+)**: objetivo, prompt, resultado, y ajuste aplicado (iteración 1 → iteración 2).
2. **Sección “Evidencia / trazabilidad”**: links o referencias a commits/PRs + resumen de qué se corrigió gracias a IA vs revisión humana.
3. **3–5 ejemplos reales de `// 🛡️ HUMAN CHECK`** con **ruta de archivo**, contexto y decisión (seguridad, docker/infra, mensajería, lógica de negocio).
4. **Tabla “Lo que la IA hizo mal”** con columnas: _Problema_ → _Cómo se detectó_ → _Fix aplicado_ → _Prevención (regla/checklist/test)_.

### Conclusión (Paso 1)

El documento funciona como introducción, pero **no alcanza el estándar AI-First** esperado por la rúbrica porque no deja evidencia ni un workflow replicable. Con los ajustes propuestos, puede convertirse en un “documento vivo” realmente útil para auditoría y transferencia de aprendizaje.

## 2. Calidad del Codigo & HUMAN CHECK

**Calificación: 5 - Excelente**

El código auditado demuestra un alto estándar de calidad y un uso excepcional de la metodología de revisión humana.

- **Sentinel Comments:** Se encontraron **35 instancias** de `// 🛡️ HUMAN CHECK` documentando decisiones críticas.
- **Calidad de los comentarios:** No son triviales. Cubren temas complejos como:
  - **Race Conditions:** `TurnosService.asignarConsultorio` explica cómo evita condiciones de carrera.
  - **Performance:** `SchedulerService` advierte sobre los límites de `@Interval`.
  - **Seguridad:** `docker-compose.yml` advierte sobre credenciales por defecto.
  - **Lógica de Negocio:** `TurnosService.findPacientesEnEspera` justifica el ordenamiento en memoria.

## 3. Transparencia ("Lo que la IA hizo mal")

**Calificación: 3 - Aceptable**

El `README.md` incluye una sección llamada **"📝 Notas de Auditoría (Fixes recientes)"** que lista correcciones importantes (Type Safety, Race Conditions, Docker Networking).

- **Por mejorar:** La rúbrica exige explícitamente el título **"Lo que la IA hizo mal"**. Aunque el contenido es técnicamente correcto y honesto, se debe ajustar el título para cumplir con el requisito de "Anti-Pattern Log" y hacerlo más visible como lecciones aprendidas de errores de la IA, no solo como "fixes".

## 4. Arquitectura & Docker

**Calificación: 4 - Bueno**

La arquitectura es robusta y sigue los principios de microservicios.

- **Puntos Fuertes:**
  - `docker-compose.yml` bien estructurado con redes y volúmenes.
  - Uso extensivo de variables de entorno con valores por defecto documentados.
  - Contenedores nombreados y separados por responsabilidad.
- **Oportunidad de Mejora:**
  - Faltan `healthchecks` en `producer` y `consumer` para asegurar que esperen a que RabbitMQ y Mongo estén **realmente listos** antes de iniciar, más allá del `depends_on` (que solo espera al inicio del contenedor).

## 5. Git Flow & Colaboracion

**Calificación: 4 - Bueno**

Se evidencia una estructura de ramas (`main`, `team-three`, `review` folder) sugiriendo trabajo paralelo.

- El proyecto tiene una estructura clara.
- pero se considera manejar mas ramas segun los features a desarrollar, co
- Se recomienda asegurar que `main` esté protegido y que todo pase por PRs desde ramas `feature/*` o `team-*`.

**✅ Versión equilibrada (recomendada)**

- Aunque el repositorio tiene main y develop, y existen algunas ramas feature/\*, el uso de ramas por funcionalidad no parece consistente. Esto puede indicar que parte del desarrollo se integró directamente en ramas principales (o que el equipo trabajó en cambios grandes sin dividir en features), lo cual aumenta el riesgo de conflictos, dificulta el code review y reduce la trazabilidad por entrega.

---

## 🏆 Bonus Challenge: "El Detector de Alucinaciones"

### Optimización AI-First

**Hallazgo:** Ineficiencia en `SchedulerService` (Backend Consumer).

**Ubicación:** `backend/consumer/src/scheduler/scheduler.service.ts`

**Problema Detectado:**
Dentro del método `handleSchedulerTick`, que se ejecuta **cada segundo**, se genera un nuevo array de strings para representar los consultorios:

```typescript
// Línea 57-60
const todosConsultorios = Array.from(
  { length: this.totalConsultorios },
  (_, i) => String(i + 1),
);
```

Esto crea objetos innecesarios en el Heap en cada ciclo del scheduler (frecuencia alta), lo cual es ineficiente y aumenta la presión sobre el Garbage Collector.

**Propuesta de Optimización:**
Mover la generación de `todosConsultorios` al constructor o a una propiedad de la clase, ya que `totalConsultorios` es constante durante la vida del servicio.

**Código Optimizado:**

```typescript
@Injectable()
export class SchedulerService {
    // ...
    private readonly todosConsultorios: string[]; // Propiedad de clase

    constructor(...) {
        this.totalConsultorios = Number(process.env.CONSULTORIOS_TOTAL) || DEFAULT_CONSULTORIOS;

        // Optimización: Generar el array una sola vez al inicio
        this.todosConsultorios = Array.from(
            { length: this.totalConsultorios },
            (_, i) => String(i + 1),
        );
    }

    @Interval(SCHEDULER_INTERVAL_MS)
    async handleSchedulerTick(): Promise<void> {
        // ...
        // Usar la propiedad pre-calculada
        const libres = this.todosConsultorios.filter(c => !ocupados.includes(c));
        // ...
    }
}
```

**Impacto Cuantificable (Métrica Z%):**

- **Reducción de asignaciones en el hot path:** **100%** para la creación de `todosConsultorios` en cada tick.
  - Antes: se creaba `todosConsultorios` en cada ejecución de `handleSchedulerTick` (cada 1s).
  - Después: se precalcula una sola vez en el constructor y se reutiliza.

- **Objetos evitados (por frecuencia 1 Hz):**
  - **Por tick:** se evita crear **1 array + N strings** (donde `N = totalConsultorios`).
  - **Por minuto:** **60 arrays + 60×N strings** evitados.
  - **Por hora:** **3600 arrays + 3600×N strings** evitados.

- **Efecto esperado:** se elimina trabajo repetitivo (incluida la conversión `String(i + 1)`) en un método de alta frecuencia, reduciendo presión de CPU/GC en el “hot path”.

---

## Mejoras futuras y estrategia de pruebas

**Recomendación:** Para asegurar la fiabilidad del sistema y cumplir con los estándares AI-First, se recomienda implementar Pruebas Unitarias para el **Consumer** (Lógica del Scheduler) y el **Frontend** (Componentes Clave).

### Estructura de pruebas recomendada

Hemos creado archivos de prueba de ejemplo en `refactor/fix/docs` que deben moverse a sus directorios fuente respectivos:

1.  **Backend Consumer (Scheduler)**:
    - Ubicación Actual: `refactor/fix/docs/scheduler.service.spec.ts`
    - **Ubicación Objetivo:** `backend/consumer/src/scheduler/scheduler.service.spec.ts`
    - _Propósito:_ Validar la lógica de asignación de turnos y manejo de consultorios libres/ocupados.

2.  **Frontend (Página Principal)**:
    - Ubicación Actual: `refactor/fix/docs/HomePage.test.tsx`
    - **Ubicación Objetivo:** `frontend/src/app/page.test.tsx`
    - _Propósito:_ Validar que la página principal renderice correctamente y se conecte al WebSocket.

### Ejemplo: Snippet de prueba unitaria frontend

```typescript
// Ejemplo de refactor/fix/docs/HomePage.test.tsx
describe('Home Page', () => {
    it('renders the title', () => {
        render(<Home />);
        const title = screen.getByText(/Turnos Médicos/i);
        expect(title).toBeInTheDocument();
    });
});
```

Para ejecutar estas pruebas, necesitarás agregar la configuración de `jest` a los archivos `package.json` respectivos.

---

### Conclusion

El proyecto **reservasSofka** es un excelente ejemplo de aplicación de la metodología AI-First. El equipo ha demostrado no solo capacidad técnica para construir microservicios, sino una madurez notable para auditar y corregir a la IA en puntos críticos de seguridad y concurrencia.
