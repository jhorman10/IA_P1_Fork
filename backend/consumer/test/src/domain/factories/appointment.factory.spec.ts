import { AppointmentFactory } from '../../../../src/domain/factories/appointment.factory';
import { IdCard } from '../../../../src/domain/value-objects/id-card.value-object';
import { Priority } from '../../../../src/domain/value-objects/priority.value-object';
import { FullName } from '../../../../src/domain/value-objects/full-name.value-object';

describe('AppointmentFactory', () => {
    it('should create a new appointment with default waiting status', () => {
        const idCard = new IdCard(12345);
        const fullName = 'John Doe';

        const appointment = AppointmentFactory.createNew(idCard, fullName);

        expect(appointment.idCard.equals(idCard)).toBe(true);
        expect(appointment.fullName.toValue()).toBe(fullName);
        expect(appointment.status).toBe('waiting');
        expect(appointment.priority.toValue()).toBe('medium'); // Default priority
        expect(appointment.office).toBeNull();
    });

    it('should allow creating with explicit priority', () => {
        const idCard = new IdCard(12345);
        const appointment = AppointmentFactory.createWithPriority(idCard, 'Jane Doe', 'high');

        expect(appointment.priority.toValue()).toBe('high');
        expect(appointment.fullName.toValue()).toBe('Jane Doe');
    });
});
