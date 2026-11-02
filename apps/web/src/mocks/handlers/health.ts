import { health } from '../data/health';
import { http, HttpResponse } from 'msw';

export const healthHandlers = [
  http.get('/api/health', () => HttpResponse.json(health)),
];
