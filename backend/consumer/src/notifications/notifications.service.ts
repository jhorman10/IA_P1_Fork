import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    /**
     * Send notification (currently just logs).
     */
    async sendNotification(idCard: number, office: string | null): Promise<void> {
        const message = office
            ? `Your appointment has been assigned to office ${office}`
            : 'Your appointment has been registered. Waiting for assignment.';
        this.logger.log(`📩 Notification sent to patient ${idCard}: ${message}`);
    }
}
