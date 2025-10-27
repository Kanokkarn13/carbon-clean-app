import theme from './theme';

export const baseLineChartConfig = (decimalPlaces = 1) => ({
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces,
  color: (o = 1) => `rgba(16,185,129,${o})`,
  labelColor: () => theme.sub,
  propsForDots: { r: '3.5', strokeWidth: '2' },
  propsForBackgroundLines: { strokeDasharray: '' },
});
