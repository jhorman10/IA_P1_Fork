# 🏗️ Context: Project & Architecture

## 1. Project Overview
Sistema de gestión de turnos médicos en tiempo real. Los pacientes registran citas vía API REST, se procesan asincrónicamente mediante colas de mensajes, y se visualizan en un dashboard con actualizaciones WebSocket en tiempo real.

### Arquitectura
- **Patrón:** Microservicios Event-Driven (Producer → RabbitMQ → Consumer)
- **Flujo:** API REST → Publish → Queue → Consume → MongoDB → WebSocket → Dashboard

### Estructura de carpetas clave
```
├── GEMINI.md                ← Kernel (Orquestador)
├── docs/agent-context/      ← Módulos de Contexto (Project, Rules, Workflow)
├── DEBT_REPORT.md           ← Estado consolidado de feedback y deuda técnica
├── AI_WORKFLOW.md           ← Documentación de metodología para humanos
├── skills/                  ← Skills para sub-agentes
├── backend/
│   ├── producer/src/        ← API REST, DTOs, WebSocket Gateway
│   └── consumer/src/        ← Scheduler, lógica de asignación
├── frontend/src/            ← Páginas Next.js, componentes
└── docker-compose.yml
```

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Backend | NestJS | ^10.x | TypeScript, dos microservicios |
| Frontend | Next.js | ^15.x | App Router, CSS Modules |
| Database | MongoDB | 7.x | Mongoose ODM |
| Messaging | RabbitMQ | 3.x-management | amqplib, durable queues |
| Real-time | Socket.IO | ^4.x | WebSocket Gateway en Producer |
| Infrastructure | Docker Compose | v2 | Multi-container orchestration |
| Testing | Jest | ^29.x | NestJS Testing Module |
| Validation | class-validator | ^0.14.x | DTOs con decoradores |
