# Matriz de Riesgos ASD - admin-profiles-exclusive-mode-navigation (SPEC-017)

## 1. Resumen

Contexto evaluado:

- La spec activa rediseña una pantalla administrativa de uso frecuente desde multipanel hacia selector de modo exclusivo.
- El cambio es frontend-first y no introduce endpoints nuevos, pero concentra compatibilidad con tres contextos operativos en la misma ruta.
- El cambio reciente introduce switchMode como punto unico para transicionar entre profiles, specialties y offices.
- El fix observado limpia modalOpen, selectedProfile y modalError al salir del modo profiles.
- Existen tests focalizados que verifican que el modal no reaparece al volver desde offices ni desde specialties.
- La spec no define SLA ni umbrales de performance, por lo que no corresponde artefacto de performance en esta fase.

Estado del riesgo principal previo:

- R-017-001 modal persistente al volver a profiles: RESUELTO.

Riesgos residuales abiertos: 4 | Alto (A): 0 | Medio (S): 4 | Bajo (D): 0

Leyenda ASD:

- A = testing obligatorio. Si queda sin evidencia suficiente, bloquea el cierre QA.
- S = testing recomendado. Debe quedar trazado si se difiere.
- D = testing opcional o mejora diferible.

## 2. Revalidacion del riesgo principal

### R-017-001 - Persistencia involuntaria de estado del modal de perfiles

Estado anterior:

- Riesgo alto y bloqueante, porque el modal podia sobrevivir al cambio de modo y reaparecer al regresar a profiles.

Evidencia nueva observada:

- La pagina define switchMode como punto de cambio de modo.
- Al salir de profiles, switchMode ejecuta limpieza explicita de modalOpen, selectedProfile y modalError.
- La suite frontend/test/app/admin/profiles/page.spec.tsx agrega dos casos focalizados para offices y specialties que verifican que el modal no reaparece al volver.

Decision QA:

- Riesgo principal resuelto a nivel de codigo y cobertura observable.
- Ya no se considera bloqueante para el cierre QA de SPEC-017.
- La limpieza interna de selectedProfile y modalError se confirma por inspeccion estatica del codigo; las pruebas nuevas validan principalmente el efecto visible esperado por negocio.

## 3. Matriz de riesgos residuales abiertos

| ID        | HU / Area                                                                          | Descripcion del riesgo                                                                                                                                                                                                                  | Factores de riesgo                                                                           | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-017-002 | HU-01 y HU-02 errores visibles fuera del modo activo                               | Los errores de especialidades o del modal podrian quedar insuficientemente cubiertos frente a cambios de modo, generando confusion operativa si una regresion vuelve a exponer mensajes en un contexto equivocado.                      | Multiples hooks de datos, errores remotos y locales, cobertura parcial por tipo de error     | S         | Recomendado       | Hay evidencia para perfiles y consultorios, y el fix del modal reduce fuga de estado. Sigue faltando un caso explicito para errores de especialidades y para errores del modal durante alternancia de modos.           |
| R-017-003 | HU-01 accesibilidad y usabilidad del selector                                      | El selector puede no comunicar suficientemente el modo activo a lectores de pantalla o navegacion por teclado, y podria degradarse en viewport reducido si los controles no ofrecen estados de foco ni comportamiento responsive claro. | Pantalla de uso frecuente, sin pruebas a11y dedicadas, semantica custom                      | S         | Recomendado       | El selector tiene aria-label y marca el modo activo con aria-current. No hay evidencia de foco visible, navegacion por teclado ni verificacion responsive.                                                             |
| R-017-004 | HU-02 compatibilidad con SPEC-015 y SPEC-016 dentro del nuevo contenedor exclusivo | SpecialtyManager y OfficeManager pueden seguir montando visualmente pero perder continuidad funcional despues de cambios de modo, por ejemplo en acciones CRUD o errores locales que no se reprobaron dentro del nuevo flujo exclusivo. | Dependencias entre features previas, componentes reutilizados, cambio de composicion visible | S         | Recomendado       | La pagina sigue reutilizando ambos componentes y las pruebas verifican su presencia en su modo. Falta una regresion integrada que ejecute acciones propias de especialidades y consultorios despues de alternar modos. |
| R-017-005 | Cobertura de regresion de la pagina                                                | La pagina tiene dos suites parcialmente superpuestas. Si los nuevos casos focalizados se mantienen solo en una de ellas, puede aparecer drift y reducir la confianza de regresion en futuras iteraciones.                               | Cobertura duplicada, mantenimiento paralelo, riesgo de divergencia                           | S         | Recomendado       | Ambas suites cubren el flujo principal. Los casos nuevos del modal persistente quedaron localizados en frontend/test/app/admin/profiles/page.spec.tsx, lo que conviene monitorear para evitar desalineacion futura.    |

## 4. Cobertura lograda y gaps residuales

### Cobertura lograda

- La vista por defecto en profiles y la exclusividad visual basica entre profiles, specialties y offices estan cubiertas por dos suites de pagina.
- El selector permanece visible durante los cambios de modo y marca el modo activo.
- El CTA Crear perfil esta cubierto solo dentro del modo profiles.
- Existe evidencia de aislamiento de errores para profiles y consultorios.
- El fix del modal persistente ahora tiene evidencia de codigo y pruebas focalizadas para el retorno desde offices y specialties.
- La proteccion admin-only se mantiene cubierta por pruebas.

### Gaps residuales no bloqueantes

- No existe prueba explicita de error aislado para especialidades ni de error del modal al alternar modos.
- No existe prueba de accesibilidad del selector con teclado, foco visible o anuncio del modo activo para tecnologia asistiva.
- No existe prueba responsive del selector de modo o del comportamiento visual en viewport reducido.
- No existe regresion integrada que pruebe acciones reales de SpecialtyManager y OfficeManager luego de alternar modos dentro de /admin/profiles.
- Las suites frontend/test y frontend/src/**tests** cubren buena parte del mismo comportamiento; hoy ayudan, pero pueden divergir si una se actualiza sin la otra.

## 5. Bloqueantes y no bloqueantes para cerrar la spec

### Bloqueantes QA

- No hay riesgos ASD de nivel A abiertos dentro del alcance revisado.
- No se identifica bloqueo QA para cerrar SPEC-017 por el fix del modal persistente.

### No bloqueantes a seguir

- Cobertura de accesibilidad del selector.
- Cobertura de errores de especialidades y del modal al alternar modos.
- Regresion funcional cruzada con SPEC-015 y SPEC-016 dentro del contenedor exclusivo.
- Riesgo de drift entre suites duplicadas de la misma pagina.

## 6. Decision QA local

Resultado QA local: sin bloqueo para cierre de SPEC-017 desde QA, con riesgos residuales no bloqueantes y trazados.

Interpretacion:

- El rediseño sigue atacando correctamente la causa raiz de mezcla de vistas al usar un unico estado de modo.
- El fix reciente resuelve el principal riesgo UX observado en la revision anterior: el modal persistente al volver a profiles.
- La cobertura nueva es suficiente para desactivar el bloqueo QA asociado a ese defecto, aunque siguen existiendo huecos razonables de robustez y mantenimiento.
- Esta decision se basa en revision estatica de spec, codigo y suites existentes; no se ejecutaron tests en esta sesion.

## 7. Evidencia base usada para esta salida

### Focal validada por el usuario

- .github/specs/admin-profiles-exclusive-mode-navigation.spec.md
- frontend/src/app/admin/profiles/page.tsx
- frontend/test/app/admin/profiles/page.spec.tsx
- docs/output/qa/admin-profiles-exclusive-mode-navigation-gherkin.md
- docs/output/qa/admin-profiles-exclusive-mode-navigation-risks.md

### Contexto adicional consultado en el workspace

- .github/docs/lineamientos/qa-guidelines.md
- frontend/src/**tests**/pages/AdminProfilesPage.test.tsx
- frontend/src/app/admin/profiles/page.module.css
- frontend/src/components/OfficeManager/OfficeManager.tsx
- frontend/src/components/SpecialtyManager/SpecialtyManager.tsx
