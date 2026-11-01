# Third-party visualization component

This project uses **hypergraph-plotter 1.1.1** by **Phileas Dazeley-Gaist**.

- Source: https://github.com/phileasdg/hypergraph-plotter
- Pinned source commit: `c28759c4d5320ab005dcff5f4aae588290a8879e`
- Upstream package metadata declares the **MIT** license.
- Vendored files: `src/vendor/hypergraph-plotter/{hypergraph-plotter.js,geom.js,layout.js,package.json}`.
- Local patch: dispose of window mouse listeners when the plot is destroyed, so switching periods or views does not retain old plot instances.
- Integration: `src/hypergraph-view.js`; local browser bundle: `dist/hypergraph-view.js`. Rebuild using `npm run build`.

The library is used for SVG geometry, layout and pointer interaction only. Dataset filtering, overlap metrics, user trajectories, bridge rankings, model training, predictions and evaluation remain this project's existing implementation.

MIT License

Copyright (c) Phileas Dazeley-Gaist

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
