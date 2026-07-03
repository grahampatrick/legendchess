import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { CalendarSchema, type Calendar } from './daily';

const CALENDAR_PATH = path.resolve(process.cwd(), '../../content/calendar.json');

export const loadCalendar = async (): Promise<Calendar> =>
  CalendarSchema.parse(JSON.parse(await readFile(CALENDAR_PATH, 'utf8')));
