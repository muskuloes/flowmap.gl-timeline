import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const packageJson = require("./package.json");

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: "esm",
        sourcemap: true,
      },
    ],
    external: [
      "d3-array",
      "d3-color",
      "d3-scale",
      "d3-time",
      "mjolnir.js",
      "@flowmap.gl/data",
      "react",
      "react-dom",
      "react-use",
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: "./tsconfig.json" }),
    ],
    onwarn: function (warning) {
      if (warning.code === "CIRCULAR_DEPENDENCY") {
        return;
      }
      console.warn(warning.message);
    },
  },
  {
    input: "dist/esm/types/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "esm" }],
    external: [
      "d3-array",
      "d3-color",
      "d3-scale",
      "d3-time",
      "mjolnir.js",
      "@flowmap.gl/data",
      "react",
      "react-dom",
      "react-use",
    ],
    plugins: [dts.default()],
  },
];
