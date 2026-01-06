"use client";

export function KinetixLogo({
  className = "",
  size = 60,
  color = "white",
}: {
  className?: string;
  size?: number;
  color?: string;
}) {
  // Calculate stroke width based on size (proportional, minimum 2)
  const strokeWidth = Math.max(2, size / 25);
  // Spacing between parallel lines (consistent throughout)
  const spacing = size / 10;

  // Coordinates for a proper K shape
  const stemX1 = 20;
  const stemX2 = 20 + spacing;
  const topY = 15;
  const bottomY = 85;
  const midY = 50; // Middle point where diagonals meet

  // Upper diagonal - goes from middle of stem to top right
  const upperStartX = stemX2;
  const upperStartY = midY;
  const upperEndX = 80;
  const upperEndY = 25;

  // Lower diagonal - goes from middle of stem to bottom right
  const lowerStartX = stemX2;
  const lowerStartY = midY;
  const lowerEndX = 80;
  const lowerEndY = 75;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Vertical Stem - Two parallel vertical lines */}
      <line
        x1={stemX1}
        y1={topY}
        x2={stemX1}
        y2={bottomY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1={stemX2}
        y1={topY}
        x2={stemX2}
        y2={bottomY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Upper Diagonal Stroke - Two parallel lines from middle to top right */}
      <line
        x1={upperStartX}
        y1={upperStartY}
        x2={upperEndX}
        y2={upperEndY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1={upperStartX + spacing}
        y1={upperStartY}
        x2={upperEndX + spacing}
        y2={upperEndY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Lower Diagonal Stroke - Two parallel lines from middle to bottom right */}
      <line
        x1={lowerStartX}
        y1={lowerStartY}
        x2={lowerEndX}
        y2={lowerEndY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1={lowerStartX + spacing}
        y1={lowerStartY}
        x2={lowerEndX + spacing}
        y2={lowerEndY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Horizontal Connecting Segment - Creates the notch where diagonals meet */}
      <line
        x1={midY}
        y1={midY - 2}
        x2={midY}
        y2={midY + 2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1={midY + spacing}
        y1={midY - 2}
        x2={midY + spacing}
        y2={midY + 2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
