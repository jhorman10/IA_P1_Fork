import { HttpAppointmentRepository } from './HttpAppointmentRepository';
import { httpGet, httpPost } from '@/lib/httpClient';
import { env } from '@/config/env';

jest.mock('@/lib/httpClient', () => ({
    httpGet: jest.fn(),
    httpPost: jest.fn(),
}));

describe('HttpAppointmentRepository', () => {
    let repository: HttpAppointmentRepository;

    beforeEach(() => {
        repository = new HttpAppointmentRepository();
        jest.clearAllMocks();
    });

    it('should fetch appointments from correctly built URL', async () => {
        const mockAppointments = [{ id: '1', fullName: 'Test' }];
        (httpGet as jest.Mock).mockResolvedValue(mockAppointments);

        const result = await repository.getAppointments();

        expect(httpGet).toHaveBeenCalledWith(`${env.API_BASE_URL}/appointments`);
        expect(result).toEqual(mockAppointments);
    });

    it('should create appointment with POST request', async () => {
        const mockDTO = { idCard: 123, fullName: 'New Patient', priority: 'high' };
        const mockResponse = { id: 'new-id', status: 'waiting' };
        (httpPost as jest.Mock).mockResolvedValue(mockResponse);

        const result = await repository.createAppointment(mockDTO as any);

        expect(httpPost).toHaveBeenCalledWith(`${env.API_BASE_URL}/appointments`, mockDTO);
        expect(result).toEqual(mockResponse);
    });
});
