/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import Home from './page';

// Mock del hook personalizado
jest.mock('../hooks/useAppointmentsWebSocket', () => ({
    useAppointmentsWebSocket: () => ({
        appointments: [
            { id: '1', fullName: 'Test Patient', status: 'waiting', office: null },
            { id: '2', fullName: 'Active Patient', status: 'called', office: '1' }
        ],
        error: null,
        connected: true
    })
}));

describe('Home Page', () => {
    it('renders the title', () => {
        render(<Home />);
        const title = screen.getByText(/Appointments/i);
        expect(title).toBeInTheDocument();
    });

    it('displays connected status', () => {
        render(<Home />);
        const status = screen.getByText(/Connected/i);
        expect(status).toBeInTheDocument();
    });

    it('renders list of appointments', () => {
        render(<Home />);
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
        expect(screen.getByText('Active Patient')).toBeInTheDocument();
    });
});
