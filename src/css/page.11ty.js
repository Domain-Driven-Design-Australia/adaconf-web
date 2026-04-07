import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import postcss from 'postcss';
import postCssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import cssnano from 'cssnano';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class {
    async data() {
        const cssDir = join(__dirname, '..', '_includes', 'css');
        const rawFilepath = join(cssDir, '_page.css');

        return {
            permalink: `css/page.css`,
            rawFilepath,
            rawCss: readFileSync(rawFilepath),
        };
    }

    async render({ rawCss, rawFilepath }) {
        return await postcss([
            postCssImport,
            autoprefixer,
            tailwindcss,
            cssnano,

        ])
            .process(rawCss, { from: rawFilepath })
            .then((result) => result.css);

    };
}
