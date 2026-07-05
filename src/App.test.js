import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Tata Capital Agentic Banking Assistant/i);
  expect(headerElement).toBeInTheDocument();
});
