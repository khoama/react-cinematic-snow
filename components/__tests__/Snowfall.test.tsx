import React from 'react';
import { render } from '@testing-library/react';
import Snowfall from '../Snowfall';

describe('Snowfall Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Snowfall />);
    expect(container).toBeInTheDocument();
  });

  it('renders three distinct canvas layers (Back, Mid, Front)', () => {
    const { container } = render(<Snowfall />);
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(3);
  });

  it('applies the custom className to the container', () => {
    const testClass = 'my-custom-snow-class';
    const { container } = render(<Snowfall className={testClass} />);
    expect(container.firstChild).toHaveClass(testClass);
  });

  it('applies blur filter style to the front layer', () => {
    const { container } = render(<Snowfall />);
    const canvases = container.querySelectorAll('canvas');
    // The last canvas (index 2) is the front layer and should have the blur filter
    expect(canvases[2]).toHaveStyle('filter: blur(2.5px)');
  });

  it('sets non-interactive container styles by default', () => {
    const { container } = render(<Snowfall />);
    expect(container.firstChild).toHaveStyle('pointer-events: none');
  });

  it('merges custom inline styles with defaults', () => {
    const { container } = render(<Snowfall style={{ zIndex: 10 }} />);
    expect(container.firstChild).toHaveStyle('pointer-events: none');
    expect(container.firstChild).toHaveStyle('z-index: 10');
  });
});
