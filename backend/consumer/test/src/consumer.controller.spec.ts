import { Test, TestingModule } from '@nestjs/testing';
import { ConsumerController } from 'src/consumer.controller';
import { NotificationsService } from 'src/notifications/notifications.service';
import { RmqContext } from '@nestjs/microservices';
import { BadRequestException, Inject } from '@nestjs/common';
import { RegisterAppointmentUseCase } from 'src/domain/ports/inbound/register-appointment.use-case';

describe('ConsumerController', () => {
    let controller: ConsumerController;
    let registerUseCase: RegisterAppointmentUseCase;
    let notificationsService: NotificationsService;

    const mockRegisterUseCase = {
        execute: jest.fn(),
    };

    const mockNotificationsService = {
        sendNotification: jest.fn(),
    };

    const mockNotificationsClient = {
        emit: jest.fn(),
    };

    const mockRmqContext = {
        getChannelRef: jest.fn().mockReturnValue({
            ack: jest.fn(),
            nack: jest.fn(),
        }),
        getMessage: jest.fn().mockReturnValue({}),
    } as unknown as RmqContext;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ConsumerController],
            providers: [
                { provide: 'RegisterAppointmentUseCase', useValue: mockRegisterUseCase },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: 'APPOINTMENT_NOTIFICATIONS', useValue: mockNotificationsClient },
            ],
        }).compile();

        controller = module.get<ConsumerController>(ConsumerController);
        registerUseCase = module.get<RegisterAppointmentUseCase>('RegisterAppointmentUseCase');
        notificationsService = module.get<NotificationsService>(NotificationsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('handleCreateAppointment', () => {
        it('should process appointment successfully', async () => {
            const data = { idCard: 12345678, fullName: 'John Doe', priority: 'medium' as any };
            const appointment = { idCard: 12345678, office: null, _id: 'id' };
            mockRegisterUseCase.execute.mockResolvedValue(appointment);

            await controller.handleCreateAppointment(data, mockRmqContext);

            expect(mockRegisterUseCase.execute).toHaveBeenCalledWith(data);
            expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
            expect(mockNotificationsClient.emit).toHaveBeenCalled();
            expect(mockRmqContext.getChannelRef().ack).toHaveBeenCalled();
        });

        it('should nack and move to DLQ on fatal error (BadRequest)', async () => {
            const data = { idCard: 12345678, fullName: 'John Doe' };
            mockRegisterUseCase.execute.mockRejectedValue(new BadRequestException('idCard must be numeric'));

            await controller.handleCreateAppointment(data, mockRmqContext);

            expect(mockRmqContext.getChannelRef().nack).toHaveBeenCalledWith(expect.anything(), false, false);
        });

        it('should requeue on transient error', async () => {
            const data = { idCard: 12345678, fullName: 'John Doe' };
            mockRegisterUseCase.execute.mockRejectedValue(new Error('Transient DB Error'));

            await controller.handleCreateAppointment(data, mockRmqContext);

            expect(mockRmqContext.getChannelRef().nack).toHaveBeenCalledWith(expect.anything(), false, true);
        });

        it('should send to DLQ if max retries reached', async () => {
            const data = { idCard: 12345678, fullName: 'John Doe' };
            mockRegisterUseCase.execute.mockRejectedValue(new Error('Persistent Error'));

            // Mock 2 retries already happened (3rd attempt now)
            const mockRmqContextWithRetries = {
                getChannelRef: jest.fn().mockReturnValue({
                    ack: jest.fn(),
                    nack: jest.fn(),
                }),
                getMessage: jest.fn().mockReturnValue({
                    properties: {
                        headers: {
                            'x-death': [{ count: 2 }]
                        }
                    }
                }),
            } as unknown as RmqContext;

            await controller.handleCreateAppointment(data, mockRmqContextWithRetries);

            expect(mockRmqContextWithRetries.getChannelRef().nack).toHaveBeenCalledWith(expect.anything(), false, false);
        });
    });
});
