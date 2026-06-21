import type { AddSourceInput, EventsWriter, PartialLocation } from '@/services/contracts';
import type { LocationIntakeService } from '@/services/location-intake';

export type LocationApiHandlerDeps = {
  eventsWriter: EventsWriter;
  locationIntakeService: LocationIntakeService;
};

export type LocationApiHandler = (request: Request) => Promise<Response>;

export function createLocationApiHandler(deps: LocationApiHandlerDeps): LocationApiHandler {
  return async (request) => {
    const url = new URL(request.url);

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse({ ok: true });
      }

      if (request.method === 'POST' && url.pathname === '/sources') {
        const input = (await request.json()) as AddSourceInput;
        return jsonResponse(await deps.locationIntakeService.addSource(input));
      }

      if (request.method === 'POST' && url.pathname === '/partial-locations') {
        const input = (await request.json()) as PartialLocation;
        await deps.eventsWriter.enqueuePartialLocation(input);
        return jsonResponse({ ok: true });
      }

      return jsonResponse({ error: 'Not found.' }, 404);
    } catch (error) {
      return jsonResponse(
        {
          error: error instanceof Error ? error.message : 'Location API request failed.',
        },
        500
      );
    }
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });
}
