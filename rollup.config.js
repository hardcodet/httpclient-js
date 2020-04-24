// rollup.config.js
import typescript from "rollup-plugin-typescript2";
import pkg from './package.json'
import external from 'rollup-plugin-peer-deps-external'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
    input: "src/index.ts",
    output: [
        {
            file: pkg.main,
            format: 'cjs',
            exports: 'named',
            sourcemap: true
        },
        {
            file: pkg.module,
            format: 'es',
            exports: 'named',
            sourcemap: true
        }
    ],
    external: [ "axios", "date-fns" ],
    plugins: [
        external(),
        resolve(),
        typescript({
            rollupCommonJSResolveHack: true,
            clean: true
        }),
        commonjs({
            include: ['node_modules/**']
        })
    ]
}
