import { Liquid } from 'liquidjs';
import { DateTime } from 'luxon';

import html from '../docs/_layouts/default.html';

const engine = new Liquid();

export async function render(data: any): Promise<string> {

    const generated = DateTime.now().toUTC().toISO();
    return engine.parseAndRender(html, { generated, ...data });
}

