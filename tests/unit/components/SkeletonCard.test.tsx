import { render, screen } from '@testing-library/react';
import SkeletonCard from '../../../components/ui/SkeletonCard';

describe('SkeletonCard', () => {
  it('renders the expected skeleton placeholders', () => {
    render(<SkeletonCard />);

    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton-line')).toHaveLength(4);
  });
});
