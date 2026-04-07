# Matriz de Riesgos ASD - readable-doctor-linking-for-profiles

## 1. Resumen

Contexto evaluado:

- Alcance acotado a frontend admin para el refinamiento UX de perfiles doctor.
- Integraciones reutilizadas: catalogo protegido de medicos y CRUD existente de perfiles.
- No hubo cambios backend obligatorios ni cambios de base de datos.
- La spec no define SLA, umbrales de performance ni metas tipo P95/TPS, por lo que no aplica un artefacto de performance en esta fase.

Total: 5 riesgos | Alto (A): 1 | Medio (S): 3 | Bajo (D): 1

Leyenda ASD:

- A = testing obligatorio. Si queda sin mitigacion razonable, bloquea el cierre.
- S = testing recomendado. Debe quedar trazado si se difiere.
- D = testing opcional o mejora diferible.

## 2. Matriz de riesgos

| ID        | HU / Area                       | Descripcion del riesgo                                                                                                                                                 | Factores de riesgo                                                            | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                                                                      |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-014-001 | HU-01 vinculacion doctor        | El perfil podria quedar vinculado al medico incorrecto si la seleccion legible no preserva el identificador interno correcto al crear o editar.                        | Integracion frontend-backend, dato operativo critico, codigo nuevo            | A         | Obligatorio       | El modal solo arma `doctor_id` desde la opcion elegida y mantiene preseleccion en edicion; hay evidencia unitaria de selector visible, preseleccion y payload interno en codigo. |
| R-014-002 | Catalogo protegido de medicos   | Un fallo de auth o del endpoint de medicos deja al Administrador sin catalogo para vincular perfiles doctor.                                                           | Integracion externa, dependencia auth, modulo administrativo de uso frecuente | S         | Recomendado       | El hook consume token desde `useAuth`, llama `getDoctors(undefined, token)` y el selector muestra mensajes de carga o error.                                                     |
| R-014-003 | UX de error al cargar catalogo  | Ante error de carga, la UI informa el fallo pero el submit no queda bloqueado explicitamente y puede terminar mostrando una validacion generica de seleccion faltante. | Nueva logica UI, feedback inconsistente, flujo alterno poco cubierto          | S         | Recomendado       | Existe mensaje de error visible en el selector; no se ve control dedicado para deshabilitar el submit cuando el catalogo falla.                                                  |
| R-014-004 | Cobertura automatizada SPEC-014 | La suite nueva no demuestra el caso con catalogo cargado y submit sin medico seleccionado, ni los estados loading/error del selector.                                  | Cobertura parcial de criterios, codigo nuevo sin evidencia completa           | S         | Recomendado       | Hay tests unitarios para happy path, estado vacio, preseleccion y hook con token; faltan escenarios clave de validacion y resiliencia visual.                                    |
| R-014-005 | Eficiencia de carga             | El hook de medicos hace fetch al montarse el modal aunque este cerrado, lo que agrega una llamada temprana no necesaria al abrir la pagina admin.                      | Optimizacion diferible, acoplamiento de carga, sin SLA explicito              | D         | Opcional          | No impacta la correccion funcional del refinamiento y no hay indicios de bloqueo operativo inmediato.                                                                            |

## 3. Plan de mitigacion para riesgos A

### R-014-001 - Vinculacion del perfil al medico incorrecto

- Mitigacion actual:
  - El valor persistido se construye a partir de la seleccion del selector y no desde un input libre.
  - El modo edicion precarga `doctor_id` ya vinculado.
  - La cobertura unitaria valida selector legible y preseleccion del medico en edicion.
- Falta para cerrar completamente:
  - Agregar una prueba automatizada que haga submit con un medico elegido y aserte el payload enviado por el modal o por la pagina admin.
- Bloquea cierre hoy: No. La mitigacion actual es suficiente para marcar la spec como IMPLEMENTED, aunque la evidencia automatizada puede fortalecerse.

## 4. Gaps residuales y observaciones QA

- No se encontro evidencia automatizada del criterio 1.3 exacto con catalogo cargado y sin seleccion.
- No se encontro evidencia automatizada del estado `loading` ni del estado de error del selector.
- La implementacion muestra el error del catalogo, pero no bloquea el boton de submit de forma especifica para ese estado.
- El hook `useDoctorOptions` hace fetch de medicos en montaje, incluso antes de interactuar con el modal o cambiar el rol a doctor.
- La spec tiene una inconsistencia documental menor: el frontmatter ya esta en `IMPLEMENTED`, mientras el cuerpo aun conserva una nota historica de implementacion en curso. No bloquea QA, pero conviene alinearlo.

## 5. Decision QA local

Resultado QA local: cierre favorable con riesgos residuales S/D.

Interpretacion:

- El refinamiento UX central esta implementado y visible en codigo: ya no se expone un campo libre para `Doctor ID`, existe selector legible, hay estado vacio, preseleccion en edicion y el payload sigue usando `doctor_id`.
- La evidencia automatizada nueva cubre happy path principal, estado vacio y carga del catalogo con token, por lo que el cambio puede considerarse implementado.
- No veo un blocker real en el workspace que impida marcar SPEC-014 como `IMPLEMENTED`.
- Quedan mejoras recomendadas antes de endurecer regresion: prueba del submit sin seleccion con catalogo cargado, prueba del estado error/loading y ajuste UX para bloquear submit cuando el catalogo falle.

## 6. Evidencia base usada para esta salida

- `frontend/src/components/ProfileFormModal/ProfileFormModal.tsx`
- `frontend/src/components/ProfileFormModal/DoctorSelectorField.tsx`
- `frontend/src/hooks/useDoctorOptions.ts`
- `frontend/src/services/doctorService.ts`
- `frontend/test/components/ProfileFormModal.spec.tsx`
- `frontend/test/hooks/useDoctorOptions.spec.ts`
- `frontend/test/services/http-services.coverage.spec.ts`
- `.github/specs/readable-doctor-linking-for-profiles.spec.md`
