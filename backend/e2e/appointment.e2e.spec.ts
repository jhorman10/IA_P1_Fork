import { utils } from './utils';

describe('E2E: Appointment Flow', () => {
  it('Crea un turno y lo persiste en MongoDB', async () => {
    const payload = {
      idCard: 'E2E123456',
      fullName: 'Test User',
      birthDate: '1990-01-01',
      phone: '1234567890',
    };

    // 1. Crear turno vía API
    const res = await utils.api.post('/appointments').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');

    // 2. Esperar procesamiento asíncrono (RabbitMQ → Consumer)
    await new Promise((r) => setTimeout(r, 1500));

    // 3. Verificar persistencia en MongoDB
    const doc = await utils.mongo.db().collection('appointments').findOne({ idCard: payload.idCard });
    expect(doc).toBeTruthy();
    expect(doc.fullName).toBe(payload.fullName);
  });
});
