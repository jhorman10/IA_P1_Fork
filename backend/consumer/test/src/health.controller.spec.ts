import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from 'src/health.controller';
import { getConnectionToken } from '@nestjs/mongoose';

describe('HealthController', () => {
    let controller: HealthController;
    let mockConnection: { readyState: number };

    beforeEach(async () => {
        mockConnection = { readyState: 1 };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: getConnectionToken(),
                    useValue: mockConnection,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return ok status when DB is up', async () => {
        // Usar Partial<Response> para simular solo los métodos usados
        const mockRes: Partial<import('express').Response> = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        await controller.check(mockRes as import('express').Response);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'ok'
        }));
    });
});
