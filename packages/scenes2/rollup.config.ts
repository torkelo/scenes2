import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { RollupOptions, RollupWarning } from 'rollup';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import { nodeExternals } from 'rollup-plugin-node-externals';

const rq = createRequire(import.meta.url);
const pkg = rq('./package.json');

const config: RollupOptions[] = [
  {
    input: 'src/index.ts',
    plugins: [
      nodeExternals({
        deps: true,
        peerDeps: true,
        packagePath: './package.json',
      }),
      commonjs(),
      resolve(),
      esbuild({
        target: 'es2022',
        tsconfig: 'tsconfig.build.json',
        jsx: 'automatic',
      }),
    ],
    output: [
      {
        format: 'cjs',
        sourcemap: true,
        file: pkg.main,
        esModule: true,
        interop: 'compat',
      },
      {
        format: 'esm',
        sourcemap: true,
        dir: path.dirname(pkg.module),
        preserveModules: true,
        preserveModulesRoot: 'src',
        esModule: true,
        interop: 'compat',
      },
    ],
  },
  {
    input: './compiled/index.d.ts',
    plugins: [dts()],
    output: [
      { file: pkg.exports['.'].require.types, format: 'cjs' },
      { file: pkg.exports['.'].import.types, format: 'esm' },
    ],
    onwarn(warning: RollupWarning, warn) {
      if (
        warning.code === 'UNRESOLVED_IMPORT' &&
        warning.exporter?.endsWith('.css')
      )
        return;
      warn(warning);
    },
  },
];

export default config;
