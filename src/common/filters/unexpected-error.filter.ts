import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_CHARS_PER_MSG = 800;

// firma del error = primeras 2 líneas del stack o el mensaje
function errorSignature(err: Error): string {
  const lines = (err.stack ?? err.message).split('\n').slice(0, 2).join('|');
  return lines.trim();
}

const recentErrors = new Map<string, number>();

function isDuplicate(sig: string): boolean {
  const last = recentErrors.get(sig);
  const now = Date.now();
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  recentErrors.set(sig, now);
  // limpieza de entradas viejas para no acumular memoria
  for (const [key, ts] of recentErrors) {
    if (now - ts > DEDUP_WINDOW_MS) recentErrors.delete(key);
  }
  return false;
}

const wpLogger = new Logger('WhatsApp');

async function sendWhatsApp(text: string): Promise<void> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) {
    wpLogger.warn('CALLMEBOT_PHONE o CALLMEBOT_APIKEY no configurados, no se envió el mensaje');
    return;
  }

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${apikey}`;

  try {
    const res = await fetch(url);
    wpLogger.log(`Mensaje enviado → HTTP ${res.status}`);
  } catch (e) {
    wpLogger.error('Error al enviar mensaje de WhatsApp', e);
  }
}

function buildMessages(err: Error, req: Request, status: number): string[] {
  const now = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const method = req.method;
  const path = req.url;

  const emoji = status >= 500 ? '🚨' : '⚠️';
  const label = status >= 500 ? 'ERROR inesperado' : `Error de lógica (${status})`;

  let bodyStr = '';
  if (req.body && Object.keys(req.body).length > 0) {
    try {
      bodyStr = '\n📦 Body: ' + JSON.stringify(req.body);
    } catch {
      bodyStr = '\n📦 Body: [no serializable]';
    }
  }

  const header = `${emoji} ${label} en Guniverse API\n📅 ${now}\n🔴 [${method}] ${path}${bodyStr}\n\n`;
  const stack = err.stack ?? err.message;

  const full = header + stack;

  if (full.length <= MAX_CHARS_PER_MSG) return [full];

  // parte 1: header + primeras líneas
  const part1 = full.slice(0, MAX_CHARS_PER_MSG) + '\n...(1/2)';
  const part2 = '...(2/2)\n' + full.slice(MAX_CHARS_PER_MSG, MAX_CHARS_PER_MSG * 2);
  return [part1, part2];
}

@Catch()
export class UnexpectedErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnexpectedErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const detail = typeof response === 'object' && response !== null
        ? ((response as { message?: unknown }).message ?? exception.message)
        : exception.message;
      const detailStr = Array.isArray(detail) ? detail.join(', ') : String(detail);
      const err = new Error(detailStr);
      err.stack = undefined; // errores de negocio no tienen stack útil

      this.logger.warn(`${req.method} ${req.url} → ${status} ${exception.message}`);

      const sig = `${status}|${req.method}|${req.url}|${exception.message}`;
      if (!isDuplicate(sig)) {
        const messages = buildMessages(err, req, status);
        messages.forEach((msg, i) => {
          setTimeout(() => void sendWhatsApp(msg), i * 1500);
        });
      }

      res.status(status).json(exception.getResponse());
      return;
    }

    const err = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(`${req.method} ${req.url} → ${err.message}`, err.stack);

    const sig = errorSignature(err);
    if (!isDuplicate(sig)) {
      const messages = buildMessages(err, req, HttpStatus.INTERNAL_SERVER_ERROR);
      messages.forEach((msg, i) => {
        setTimeout(() => sendWhatsApp(msg), i * 1500);
      });
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: 'Ocurrió un error inesperado',
    });
  }
}
