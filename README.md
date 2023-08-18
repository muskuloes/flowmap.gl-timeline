# flowmap.gl-timeline

The Timeline component for flowmap.gl, from [FlowmapBlue](https://github.com/FlowmapBlue/FlowmapBlue/blob/master/core/Timeline.tsx).

## Use

This package is published to GitHub's npm registry. Follow the instructions [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#installing-a-package) on how to install packages from this registry.

```bash
npm install @muskuloes/flowmap.gl-timeline@1.0.0
```

```jsx
import { Timeline } from "@muskuloes/flowmap.gl-timeline";

<Timeline
  selectedTimeRange={selectedTimeRange}
  extent={timeExtent}
  totalCountsByTime={totalCountsByTime}
  timeGranularityKey={timeGranularityKey}
  onChange={handleTimeRangeChange} />
```

