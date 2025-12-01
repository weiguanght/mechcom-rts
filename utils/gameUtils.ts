import { Vector2 } from "../types";

export const getDistance = (p1: Vector2, p2: Vector2): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const normalize = (v: Vector2): Vector2 => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const isPointInRect = (point: Vector2, rectPos: Vector2, width: number, height: number) => {
  return point.x >= rectPos.x && point.x <= rectPos.x + width &&
         point.y >= rectPos.y && point.y <= rectPos.y + height;
};

// Check if a point is inside a circular entity
export const isPointInEntity = (point: Vector2, entityPos: Vector2, radius: number) => {
  return getDistance(point, entityPos) <= radius;
};
