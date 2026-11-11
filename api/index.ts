import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApiRequest } from './_lib/router.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleApiRequest(req, res);
}
