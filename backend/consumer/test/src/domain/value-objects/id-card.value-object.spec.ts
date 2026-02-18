import { IdCard } from '../../../../src/domain/value-objects/id-card.value-object';
import { ValidationError } from '../../../../src/domain/errors/validation.error';

describe('IdCard Value Object', () => {
    it('should create a valid IdCard from a number', () => {
        const idCard = new IdCard(123456);
        expect(idCard.toValue()).toBe(123456);
    });

    it('should create a valid IdCard from a numeric string', () => {
        const idCard = new IdCard('7890');
        expect(idCard.toValue()).toBe(7890);
    });

    it('should throw ValidationError for non-numeric strings', () => {
        expect(() => new IdCard('abc')).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative numbers', () => {
        expect(() => new IdCard(-1)).toThrow(ValidationError);
    });

    it('should throw ValidationError for zero', () => {
        expect(() => new IdCard(0)).toThrow(ValidationError);
    });

    it('should implement equality check', () => {
        const id1 = new IdCard(123);
        const id2 = new IdCard(123);
        const id3 = new IdCard(456);

        expect(id1.equals(id2)).toBe(true);
        expect(id1.equals(id3)).toBe(false);
    });
});
