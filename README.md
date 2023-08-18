# flowmap.gl-timeline

The Timeline component for flowmap.gl, from [FlowmapBlue](https://github.com/FlowmapBlue/FlowmapBlue/blob/master/core/Timeline.tsx).

## Use

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

