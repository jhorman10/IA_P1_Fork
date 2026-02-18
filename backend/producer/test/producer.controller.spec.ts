import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ProducerController } from '../src/producer.controller';
import { ProducerService } from '../src/producer.service';
import { TurnosService } from '../src/turnos/turnos.service';
import * as request from 'supertest';

describe('ProducerController (Integration Tests)', () => {
    let app: INestApplication;
    let producerService: jest.Mocked<ProducerService>;
    let turnosService: jest.Mocked<TurnosService>;

    beforeEach(async () => {
        const mockProducerService = {
            createAppointment: jest.fn(),
        };

        const mockTurnosService = {
            findByIdCard: jest.fn(),
            findAll: jest.fn(),
            toEventPayload: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProducerController],
            providers: [
                {
                    provide: ProducerService,
                    useValue: mockProducerService,
                },
                {
                    provide: TurnosService,
                    useValue: mockTurnosService,
                },
            ],
        }).compile();

        app = module.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );

        producerService = module.get(ProducerService) as jest.Mocked<ProducerService>;
        turnosService = module.get(TurnosService) as jest.Mocked<TurnosService>;

        await app.init();
    });

    afterEach(async () => {
        await app.close();
        jest.clearAllMocks();
    });

    describe('POST /appointments - Create appointment', () => {
        it('should create an appointment and return 202 Accepted', async () => {
            const createAppointmentDto = {
                idCard: 123456789,
                fullName: 'John Doe',
            };

            producerService.createAppointment.mockResolvedValue({
                status: 'accepted',
                message: 'Appointment assignment in progress',
            });

            const response = await request(app.getHttpServer())
                .post('/appointments')
                .send(createAppointmentDto)
                .expect(202);

            expect(response.body).toEqual({
                status: 'accepted',
                message: 'Appointment assignment in progress',
            });
            expect(producerService.createAppointment).toHaveBeenCalledWith(createAppointmentDto);
        });

        it('should return 400 if idCard is missing', async () => {
            const invalidPayload = {
                fullName: 'John Doe',
            };

            const response = await request(app.getHttpServer())
                .post('/appointments')
                .send(invalidPayload)
                .expect(400);

            expect(response.body.message).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('idCard'),
                ]),
            );
        });

        it('should return 400 if fullName is missing', async () => {
            const invalidPayload = {
                idCard: 123456789,
            };

            const response = await request(app.getHttpServer())
                .post('/appointments')
                .send(invalidPayload)
                .expect(400);

            expect(response.body.message).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('fullName'),
                ]),
            );
        });

        it('should return 400 if idCard is not a number', async () => {
            const invalidPayload = {
                idCard: 'invalid-text',
                fullName: 'John Doe',
            };

            const response = await request(app.getHttpServer())
                .post('/appointments')
                .send(invalidPayload)
                .expect(400);

            expect(response.body.error).toBe('Bad Request');
        });
    });

    describe('GET /appointments/:idCard - Query appointments', () => {
        it('should return appointments for a valid ID card', async () => {
            const idCard = 123456789;
            const expectedAppointments = [
                {
                    idCard: 123456789,
                    fullName: 'John Doe',
                    office: '3',
                    status: 'called',
                    createdAt: '2026-02-11T01:55:42.679Z',
                },
            ];

            turnosService.findByIdCard.mockResolvedValue(expectedAppointments as any);

            const response = await request(app.getHttpServer())
                .get(`/appointments/${idCard}`)
                .expect(200);

            expect(response.body).toEqual(expectedAppointments);
            expect(turnosService.findByIdCard).toHaveBeenCalledWith(idCard);
        });

        it('should return 400 if idCard is not a valid number', async () => {
            await request(app.getHttpServer())
                .get('/appointments/invalid-text')
                .expect(400);
        });
    });
});
