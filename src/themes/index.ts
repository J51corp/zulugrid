import type { Theme } from '../types';
import { classicTheme } from './classic';
import { modernTheme } from './modern';
import { darkTheme } from './dark';

const themes: Record<string, Theme> = {
  classic: classicTheme,
  modern: modernTheme,
  dark: darkTheme,
};

export function getTheme(id: string): Theme {
  return themes[id] ?? classicTheme;
}

export function getAllThemes(): Theme[] {
  return Object.values(themes);
}

export { classicTheme, modernTheme, darkTheme };
