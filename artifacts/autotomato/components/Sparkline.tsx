import React from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

interface SparklineProps {
  data: number[];
  color: string;
  width: number;
  height: number;
}

function buildPath(data: number[], w: number, h: number): { line: string; area: string } {
  if (data.length < 2) {
    const y = h / 2;
    return {
      line: `M0,${y} L${w},${y}`,
      area: `M0,${y} L${w},${y} L${w},${h} L0,${h} Z`,
    };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = h * 0.1;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: pad + ((1 - (v - min) / range) * (h - pad * 2)),
  }));

  const smooth = (pts: { x: number; y: number }[]): string => {
    let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C${cpx.toFixed(2)},${prev.y.toFixed(2)} ${cpx.toFixed(2)},${curr.y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`;
    }
    return d;
  };

  const line = smooth(points);
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L${last.x.toFixed(2)},${h} L${first.x.toFixed(2)},${h} Z`;

  return { line, area };
}

export function Sparkline({ data, color, width, height }: SparklineProps) {
  if (!data || data.length === 0) return <View style={{ width, height }} />;

  const { line, area } = buildPath(data, width, height);
  const gradientId = `grad_${color.replace("#", "")}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gradientId})`} />
      <Path d={line} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
