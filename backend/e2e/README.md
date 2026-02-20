# E2E Test Suite for Medical Appointments

Este archivo describe la estructura y convenciones para las pruebas end-to-end (E2E) del sistema.

## Estructura

- `appointment.e2e.spec.ts`: Pruebas E2E del flujo completo de turnos médicos.
- `utils.ts`: Utilidades para setup, teardown y helpers de la base de datos.

## Convenciones

- Usar Jest como runner y Supertest para llamadas HTTP.
- Las pruebas deben levantar el entorno vía Docker Compose y limpiar la base de datos antes de cada suite.
- Los tests deben validar el flujo: API REST → RabbitMQ → Consumer → MongoDB.

## Ejecución

1. Levantar el entorno:
   ```sh
   docker-compose up -d
   ```
2. Ejecutar las pruebas:
   ```sh
   npm run test:e2e
   ```

## Notas

- Asegúrate de que todos los servicios estén "healthy" antes de correr los tests.
- Los datos de prueba deben ser únicos para evitar colisiones.
