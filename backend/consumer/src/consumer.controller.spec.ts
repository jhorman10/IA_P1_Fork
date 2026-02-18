import { Test, TestingModule } from '@nestjs/testing';
import { ConsumerController } from './consumer.controller';
import { AppointmentService } from './appointments/appointment.service';
import { NotificationsService } from './notifications/notifications.service';
import { RmqContext } from '@nestjs/microservices';
import { BadRequestException } from '@nestjs/common';

describe('ConsumerController', () => {
    let controller: ConsumerController;
    let appointmentService: AppointmentService;
    let notificationsService: NotificationsService;

    const mockAppointmentService = {
        createAppointment: jest.fn(),
        toEventPayload: jest.fn(),
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
                { provide: AppointmentService, useValue: mockAppointmentService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: 'APPOINTMENT_NOTIFICATIONS', useValue: mockNotificationsClient },
            ],
        }).compile();

        controller = module.get<ConsumerController>(ConsumerController);
        appointmentService = module.get<AppointmentService>(AppointmentService);
        notificationsService = module.get<NotificationsService>(NotificationsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('handleCreateAppointment', () => {
        it('should process appointment successfully', async () => {
            const data = { idCard: 12345678, fullName: 'John Doe', priority: 'medium' as any };
            const appointment = { idCard: 12345678, office: null, _id: 'id' };
            mockAppointmentService.createAppointment.mockResolvedValue(appointment);
            mockAppointmentService.toEventPayload.mockReturnValue({});

            await controller.handleCreateAppointment(data, mockRmqContext);

            expect(mockAppointmentService.createAppointment).toHaveBeenCalledWith(data);
            expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
            expect(mockNotificationsClient.emit).toHaveBeenCalled();
            expect(mockRmqContext.getChannelRef().ack).toHaveBeenCalled();
        });

        it('should nack on invalid data', async () => {
            const data = { idCard: 'invalid' as any, fullName: 'John Doe' };

            await controller.handleCreateAppointment(data, mockRmqContext);

            expect(mockRmqContext.getChannelRef().nack).toHaveBeenCalledWith(expect.anything(), false, false);
        });

        it('should requeue on transient error', async () => {
            const data = { idCard: 12345678, fullName: 'John Doe' };
            mockAppointmentService.createAppointment.mockRejectedValue(new Error('Transient DB Error'));

            await controller.handleCreateAppointment(data, mockRmqContext);

            expect(mockRmqContext.getChannelRef().nack).toHaveBeenCalledWith(expect.anything(), false, true);
        });

        it('should send to DLQ if max retries reached', async () => {
            const data = { idCard: 12345678, fullName: 'John Doe' };
            mockAppointmentService.createAppointment.mockRejectedValue(new Error('Persistent Error'));

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
