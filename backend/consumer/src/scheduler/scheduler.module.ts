import { CompleteExpiredAppointmentsUseCaseImpl } from '../application/use-cases/complete-expired-appointments.use-case.impl';
import { AssignAvailableOfficesUseCaseImpl } from '../application/use-cases/assign-available-offices.use-case.impl';

@Module({
    imports: [AppointmentModule, NotificationsModule, ConfigModule],
    providers: [
        SchedulerService,
        {
            provide: 'AppointmentRepository',
            useClass: MongooseAppointmentRepository,
        },
        {
            provide: 'NotificationPort',
            useClass: RabbitMQNotificationAdapter,
        },
        {
            provide: 'CompleteExpiredAppointmentsUseCase',
            inject: ['AppointmentRepository', 'NotificationPort'],
            useFactory: (repo, notifier) => new CompleteExpiredAppointmentsUseCaseImpl(repo, notifier),
        },
        {
            provide: 'AssignAvailableOfficesUseCase',
            inject: ['AppointmentRepository', 'NotificationPort', ConfigService],
            useFactory: (repo, notifier, config) => {
                const totalOffices = Number(config.get('CONSULTORIOS_TOTAL')) || 5;
                return new AssignAvailableOfficesUseCaseImpl(repo, notifier, totalOffices);
            },
        },
    ],
    exports: [SchedulerService],
})
export class SchedulerModule { }
