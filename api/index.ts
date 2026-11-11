import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApiRequest } from './_lib/router.ts';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleApiRequest(req, res);
}
