import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
    let service: NotificationsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NotificationsService],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should log notification', async () => {
        const loggerSpy = jest.spyOn((service as any).logger, 'log');
        await service.sendNotification('12345678', '1');
        expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('📩 Notification sent to patient 12345678: Your appointment has been assigned to office 1'),
        );
    });
});
