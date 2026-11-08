import React from 'react';
import { Circle, Svg } from 'react-native-svg';

interface CountdownRingProps {
  progress: number; // 0.0 to 1.0
  size?: number;
  strokeWidth?: number;
  urgencyColor?: boolean;
}

export function CountdownRing({
  progress,
  size = 44,
  strokeWidth = 4,
  urgencyColor = true,
}: CountdownRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);

  // Dynamic urgency color
  let activeColor = '#2563eb'; // Blue
  if (urgencyColor) {
    if (clampedProgress <= 0.17) {
      activeColor = '#ef4444'; // Red (< 5s for 30s period)
    } else if (clampedProgress <= 0.34) {
      activeColor = '#f59e0b'; // Amber (< 10s)
    }
  }

  return (
    <Svg
      width={size}
      height={size}
      accessibilityLabel={`Tiempo restante: ${Math.round(clampedProgress * 30)} segundos`}
    >
      {/* Background track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Active animated stroke */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={activeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}
