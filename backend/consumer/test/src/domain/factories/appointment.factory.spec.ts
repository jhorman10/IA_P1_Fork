import { AppointmentFactory } from '../../../../src/domain/factories/appointment.factory';
import { IdCard } from '../../../../src/domain/value-objects/id-card.value-object';

describe('AppointmentFactory', () => {
    it('should create a new appointment with default waiting status', () => {
        const idCard = new IdCard(12345);
        const fullName = 'John Doe';

        const appointment = AppointmentFactory.createNew(idCard, fullName);

        expect(appointment.idCard.equals(idCard)).toBe(true);
        expect(appointment.fullName).toBe(fullName);
        expect(appointment.status).toBe('waiting');
        expect(appointment.priority).toBe('medium'); // Default priority
        expect(appointment.office).toBeNull();
    });

    it('should allow overriding default priority', () => {
        const idCard = new IdCard(12345);
        const appointment = AppointmentFactory.createNew(idCard, 'Jane Doe', 'high');

        expect(appointment.priority).toBe('high');
    });
});
