import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ProducerController } from 'src/producer.controller';
import * as request from 'supertest';

/**
 * ⚕️ HUMAN CHECK - Hexagonal Integration Test:
 * Controller depends on inbound port tokens, not concrete services.
 */
describe('ProducerController (Integration Tests)', () => {
    let app: INestApplication;
    let createAppointmentUseCase: any;
    let queryAppointmentsUseCase: any;

    beforeEach(async () => {
        const mockCreateAppointmentUseCase = {
            execute: jest.fn(),
        };

        const mockQueryAppointmentsUseCase = {
            findAll: jest.fn(),
            findByIdCard: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProducerController],
            providers: [
                {
                    provide: 'CreateAppointmentUseCase',
                    useValue: mockCreateAppointmentUseCase,
                },
                {
                    provide: 'QueryAppointmentsUseCase',
                    useValue: mockQueryAppointmentsUseCase,
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

        createAppointmentUseCase = module.get('CreateAppointmentUseCase');
        queryAppointmentsUseCase = module.get('QueryAppointmentsUseCase');

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

            // ⚕️ HUMAN CHECK - SRP: Use Case returns void (Command Pattern).
            // Controller is responsible for constructing the HTTP response.
            createAppointmentUseCase.execute.mockResolvedValue(undefined);

            const response = await request(app.getHttpServer())
                .post('/appointments')
                .send(createAppointmentDto)
                .expect(202);

            expect(response.body).toEqual({
                status: 'accepted',
                message: 'Appointment assignment in progress',
            });

            // Verify mapping: DTO -> Command
            expect(createAppointmentUseCase.execute).toHaveBeenCalledWith({
                idCard: 123456789,
                fullName: 'John Doe',
            });
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

    describe('GET /appointments - Query all appointments', () => {
        it('should return all appointments from QueryAppointmentsUseCase', async () => {
            const expectedAppointments = [
                {
                    id: 'abc-123',
                    idCard: 123456789,
                    fullName: 'John Doe',
                    office: '3',
                    status: 'called',
                    priority: 'medium',
                    timestamp: Date.now(),
                },
            ];

            queryAppointmentsUseCase.findAll.mockResolvedValue(expectedAppointments);

            const response = await request(app.getHttpServer())
                .get('/appointments')
                .expect(200);

            expect(response.body).toEqual(expectedAppointments);
            expect(queryAppointmentsUseCase.findAll).toHaveBeenCalled();
        });
    });

    describe('GET /appointments/:idCard - Query by ID card', () => {
        it('should return appointments for a valid ID card', async () => {
            const idCard = 123456789;
            const expectedAppointments = [
                {
                    id: 'abc-123',
                    idCard: 123456789,
                    fullName: 'John Doe',
                    office: '3',
                    status: 'called',
                    priority: 'medium',
                    timestamp: Date.now(),
                },
            ];

            queryAppointmentsUseCase.findByIdCard.mockResolvedValue(expectedAppointments);

            const response = await request(app.getHttpServer())
                .get(`/appointments/${idCard}`)
                .expect(200);

            expect(response.body).toEqual(expectedAppointments);
            expect(queryAppointmentsUseCase.findByIdCard).toHaveBeenCalledWith(idCard);
        });

        it('should return 400 if idCard is not a valid number', async () => {
            await request(app.getHttpServer())
                .get('/appointments/invalid-text')
                .expect(400);
        });
    });
});
