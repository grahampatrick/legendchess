import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { CalendarSchema, type Calendar } from './daily';

import { dataPath } from './dataPath';

const calendarPath = () => path.join(dataPath('content'), 'calendar.json');

export const loadCalendar = async (): Promise<Calendar> =>
  CalendarSchema.parse(JSON.parse(await readFile(calendarPath(), 'utf8')));
