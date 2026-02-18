import { Test, TestingModule } from '@nestjs/testing';
import { ConsumerController } from './consumer.controller';
import { TurnosService } from './appointments/turnos.service';
import { NotificationsService } from './notifications/notifications.service';
import { RmqContext } from '@nestjs/microservices';
import { BadRequestException } from '@nestjs/common';

describe('ConsumerController', () => {
    let controller: ConsumerController;
    let turnosService: TurnosService;
    let notificationsService: NotificationsService;

    const mockTurnosService = {
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
                { provide: TurnosService, useValue: mockTurnosService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: 'TURNOS_NOTIFICATIONS', useValue: mockNotificationsClient },
            ],
        }).compile();

        controller = module.get<ConsumerController>(ConsumerController);
        turnosService = module.get<TurnosService>(TurnosService);
        notificationsService = module.get<NotificationsService>(NotificationsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('handleCreateAppointment', () => {
        it('should process appointment successfully', async () => {
            const data = { idCard: 12345678, fullName: 'John Doe', priority: 'medium' as any };
            const appointment = { idCard: 12345678, office: null, _id: 'id' };
            mockTurnosService.createAppointment.mockResolvedValue(appointment);
            mockTurnosService.toEventPayload.mockReturnValue({});

            await controller.handleCreateAppointment(data, mockRmqContext);

            expect(mockTurnosService.createAppointment).toHaveBeenCalledWith(data);
            expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
            expect(mockNotificationsClient.emit).toHaveBeenCalled();
            expect(mockRmqContext.getChannelRef().ack).toHaveBeenCalled();
        });

        it('should nack on invalid data', async () => {
            const data = { idCard: 'invalid' as any, fullName: 'John Doe' };

            await controller.handleCreateAppointment(data, mockRmqContext);

            expect(mockRmqContext.getChannelRef().nack).toHaveBeenCalledWith(expect.anything(), false, false);
        });
    });
});
