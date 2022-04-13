import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import css from 'rollup-plugin-css-only';

export default {
    // This `main.js` file we wrote
    // each svelte component is built into a js and css file
    input: `wwwroot/js/${process.env.entry}.svelte`,
    output: {
        sourcemap: true,
        file: `wwwroot/js/build/${process.env.entry}.js`,
        format: 'umd',
        name: process.env.entry,
    },
    plugins: [
        svelte({
            //dev: true,
            //preprocess: [sveltePreprocess({ sourceMap: false })],
            // Tell the svelte plugin where our svelte files are located
            include: 'wwwroot/**/*.svelte',
            //emitCss: false,

        }),
        css({ output: `${process.env.entry}.css` }),
        resolve({
            browser: true,
            dedupe: ["svelte"]
        }),
        json(),
        commonjs(),
    ]
};