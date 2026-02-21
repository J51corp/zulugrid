import mitt from 'mitt';
import type { AppEvents } from './types';

/** Global application event bus */
export const bus = mitt<AppEvents>();
