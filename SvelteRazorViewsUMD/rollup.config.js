import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-css-only';

export default {
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
            // Tell the svelte plugin where our svelte files are located
            include: 'wwwroot/**/*.svelte',
        }),
        css({ output: `${process.env.entry}.css` }),
        resolve({
            browser: true,
            dedupe: ["svelte"]
        }),
    ]
};
