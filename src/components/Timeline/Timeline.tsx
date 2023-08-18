import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { scaleLinear, scaleTime } from "d3-scale";
import { max } from "d3-array";
import { EventManager } from "mjolnir.js";
import { Colors } from "@blueprintjs/core";
import { useMeasure, useThrottle } from "react-use";
import { hcl } from "d3-color";
import {
  areRangesEqual,
  ColorScheme,
  CountByTime,
  tickMultiFormat,
  TimeGranularity,
  TimeGranularityKey,
  TIME_GRANULARITIES,
} from "@flowmap.gl/data";
import PlayControl from "./PlayControl";
import { Absolute, Column, SelectedTimeRangeBox, TimelineBox } from "./Boxes";

interface Props {
  selectedTimeRange: [Date, Date];
  extent: [Date, Date];
  totalCountsByTime: CountByTime[];
  timeGranularityKey: TimeGranularityKey;
  onChange: (range: [Date, Date]) => void;
}

const SVG_HEIGHT = 80;
const AXIS_AREA_HEIGHT = 20;
const TOTAL_COUNT_CHART_HEIGHT = 30;

const margin = {
  top: 15,
  left: 25,
  right: 25,
  bottom: 15,
};

const Outer = styled.div({
  display: "flex",
  padding: "5px 20px",
  alignItems: "center",
  userSelect: "none",
  "&>*+*": {
    marginLeft: 10,
  },
});

const MeasureTarget = styled.div({
  display: "flex",
  flexGrow: 1,
  overflow: "hidden",
});

const TimelineSvg = styled.svg(() => ({
  cursor: "pointer",
  backgroundColor: Colors.LIGHT_GRAY4,
}));

const OuterRect = styled.rect({
  cursor: "crosshair",
  fill: "rgba(255,255,255,0)",
  stroke: "none",
});

const HandleOuter = styled.g(() => ({
  cursor: "ew-resize",
  "& > path": {
    stroke: Colors.DARK_GRAY1,
    transition: "fill 0.2s",
    fill: Colors.WHITE,
  },
  "&:hover path": {
    fill: Colors.GRAY4,
  },
}));

const HandlePath = styled.path({
  strokeWidth: 1,
} as any);

const HandleHoverTarget = styled.rect({
  fill: Colors.WHITE,
  fillOpacity: 0,
});

const SelectedTimeRangeRect = styled.rect({
  fill: Colors.BLUE5,
  cursor: "move",
  transition: "fill-opacity 0.2s",
  fillOpacity: 0.3,
  "&:hover": {
    fillOpacity: 0.4,
  },
});

const AxisPath = styled.path({
  fill: "none",
  stroke: Colors.GRAY1,
  shapeRendering: "crispEdges",
} as any);

const TickText = styled.text(() => ({
  fill: Colors.DARK_GRAY1,
  fontSize: 10,
  textAnchor: "start",
}));

const Bar = styled.rect(() => ({
  fill: ColorScheme.primary,
  stroke: hcl(ColorScheme.primary).darker().toString(),
}));

const TickLine = styled.line({
  fill: "none",
  stroke: Colors.GRAY1,
  shapeRendering: "crispEdges",
} as any);

type Side = "start" | "end";

interface HandleProps {
  width: number;
  height: number;
  side: Side;
  onMove: (pos: number, side: Side) => void;
}
const TimelineHandle: React.FC<HandleProps> = (props: HandleProps) => {
  const { width, height, side, onMove } = props;
  const handleMoveRef = useRef<any>();
  handleMoveRef.current = ({ center }: any) => {
    onMove(center.x, side);
  };
  const ref = useRef<SVGRectElement>(null);
  useEffect(() => {
    //@ts-ignore
    const eventManager = new EventManager(ref.current!, {});
    if (handleMoveRef.current) {
      eventManager.on("panstart", handleMoveRef.current);
      eventManager.on("panmove", handleMoveRef.current);
      eventManager.on("panend", handleMoveRef.current);
    }
    return () => {
      eventManager.destroy();
    };
  }, [handleMoveRef]);

  const [w, h] = [width, width];
  return (
    <HandleOuter>
      <HandlePath
        transform={`translate(${side === "start" ? 0 : width},0)`}
        d={
          side === "start"
            ? `M0,${h} Q${-w},${h} ${-w},0 L0,0 0,${height} ${-w},${height} Q${-w},${
                height - h
              } 0,${height - h} z`
            : `M0,${h} Q${w},${h} ${w},0 L0,0 0,${height} ${w},${height} Q${w},${
                height - h
              } 0,${height - h} z`
        }
      />
      <HandleHoverTarget
        x={side === "start" ? -w : w}
        ref={ref}
        height={height}
        width={width}
      />
    </HandleOuter>
  );
};

interface TimelineChartProps extends Props {
  width: number;
}

type MoveSideHandler = (pos: number, side: Side) => void;

const TimelineChart: React.FC<TimelineChartProps> = (
  props: TimelineChartProps
) => {
  const {
    width,
    extent,
    selectedTimeRange,
    timeGranularityKey,
    totalCountsByTime,
    onChange,
  } = props;

  const timeGranularity: TimeGranularity = TIME_GRANULARITIES.find(
    (e) => e.key === timeGranularityKey
  )!;
  const handleWidth = 10;
  const handleHGap = 10;
  const handleHeight =
    TOTAL_COUNT_CHART_HEIGHT + AXIS_AREA_HEIGHT + handleHGap * 2;

  const chartWidth = width - margin.left - margin.right;
  const timeScale = scaleTime();
  timeScale.domain(extent);
  timeScale.range([0, chartWidth]);

  const [offset, setOffset] = useState<number>();
  const [panStart, setPanStart] = useState<Date>();

  const svgRef = useRef<SVGSVGElement>(null);
  const outerRectRef = useRef<SVGRectElement>(null);
  const selectedTimeRangeRectRef = useRef<SVGRectElement>(null);

  const mousePosition = (absPos: number) => {
    const { current } = svgRef;
    if (current !== null) {
      const { left } = current.getBoundingClientRect();
      return absPos - left - margin.left;
    }
    return undefined;
  };

  const timeFromPos = (pos: number) => {
    const relPos = mousePosition(pos);
    if (relPos !== null) return timeScale.invert(relPos!);
    return undefined;
  };

  const handleMoveRef = useRef<any>();
  handleMoveRef.current = ({ center }: any) => {
    if (offset === null) {
      const pos = mousePosition(center.x);
      if (pos !== null) {
        const selectedPos = timeScale(selectedTimeRange[0]);
        if (selectedPos !== null) {
          setOffset(selectedPos - pos!);
        }
      }
    } else {
      let nextStart = timeFromPos(center.x + offset);
      if (nextStart) {
        const { interval } = timeGranularity;
        nextStart = interval.round(nextStart);
        const length = (interval as any).count(
          selectedTimeRange[0],
          selectedTimeRange[1]
        );
        let nextEnd = interval.offset(nextStart, length);
        if (nextStart < extent[0]) {
          nextStart = extent[0];
          nextEnd = interval.offset(extent[0], length);
        }
        if (nextEnd > extent[1]) {
          nextStart = interval.offset(extent[1], -length);
          nextEnd = extent[1];
        }
        onChange([nextStart, nextEnd]);
      }
    }
  };
  const handleMove = (evt: any) => handleMoveRef.current(evt);
  const handleMoveEnd = (evt: any) => {
    handleMoveRef.current(evt);
    setOffset(undefined);
  };

  const handleClickRef = useRef<any>();
  handleClickRef.current = (_: any) => {
    onChange(extent);
  };
  const handleClick = (evt: any) => handleClickRef.current(evt);

  const handlePanStartRef = useRef<any>();
  handlePanStartRef.current = ({ center }: any) => {
    let start = timeFromPos(center.x);
    if (start) {
      start = timeGranularity.interval.round(start);
      if (start < extent[0]) start = extent[0];
      if (start > extent[1]) start = extent[1];
      setPanStart(start);
      onChange([start, start]);
    }
  };
  const handlePanStart = (evt: any) => handlePanStartRef.current(evt);

  const handlePanMoveRef = useRef<any>();
  handlePanMoveRef.current = ({ center }: any) => {
    let end = timeFromPos(center.x);
    if (panStart && end) {
      end = timeGranularity.interval.round(end);
      if (end < extent[0]) end = extent[0];
      if (end > extent[1]) end = extent[1];
      const range: [Date, Date] =
        panStart < end ? [panStart, end] : [end, panStart];
      onChange(range);
    }
  };
  const handlePanMove = (evt: any) => handlePanMoveRef.current(evt);
  const handlePanEnd = (evt: any) => {
    handlePanMoveRef.current(evt);
    setPanStart(undefined);
  };

  useEffect(() => {
    //@ts-ignore
    const outerEvents = new EventManager(outerRectRef.current!, {});
    outerEvents.on("click", handleClick);
    outerEvents.on("panstart", handlePanStart);
    outerEvents.on("panmove", handlePanMove);
    outerEvents.on("panend", handlePanEnd);
    const selectedTimeRangeEvents = new EventManager(
      //@ts-ignore
      selectedTimeRangeRectRef.current!,
      {}
    );
    selectedTimeRangeEvents.on("panstart", handleMove);
    selectedTimeRangeEvents.on("panmove", handleMove);
    selectedTimeRangeEvents.on("panend", handleMoveEnd);
    return () => {
      outerEvents.destroy();
      selectedTimeRangeEvents.destroy();
    };
  }, [selectedTimeRange]);

  const handleMoveSideRef = useRef<MoveSideHandler>();
  handleMoveSideRef.current = (pos, side) => {
    let t = timeFromPos(pos);
    if (t !== null) {
      t = timeGranularity.interval.round(t!);
      if (t < extent[0]) t = extent[0];
      if (t > extent[1]) t = extent[1];
      if (side === "start") {
        onChange([
          t < selectedTimeRange[1] ? t : selectedTimeRange[1],
          selectedTimeRange[1],
        ]);
      } else {
        onChange([
          selectedTimeRange[0],
          t > selectedTimeRange[0] ? t : selectedTimeRange[0],
        ]);
      }
    }
  };
  const handleMoveSide: MoveSideHandler = (pos, kind) => {
    if (handleMoveSideRef.current) {
      handleMoveSideRef.current(pos, kind);
    }
  };

  const minLabelWidth = 70;
  const ticks = timeScale.ticks(
    Math.min(
      (timeGranularity.interval as any).count(extent[0], extent[1]),
      chartWidth / minLabelWidth
    )
  );

  const totalCountScale = scaleLinear()
    .domain([0, max(totalCountsByTime, (d) => d.count) ?? 0])
    .range([0, TOTAL_COUNT_CHART_HEIGHT]);

  const tickLabelFormat = tickMultiFormat; // timeScale.tickFormat();
  return (
    <TimelineSvg ref={svgRef} width={width} height={SVG_HEIGHT}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {ticks.map((t, i) => {
          const xPos = timeScale(t);
          if (xPos === null) return null;
          return (
            <g key={i} transform={`translate(${xPos},${0})`}>
              <TickLine
                y1={0}
                y2={TOTAL_COUNT_CHART_HEIGHT + AXIS_AREA_HEIGHT}
              />
              {xPos < chartWidth && (
                <TickText x={3} y={12}>
                  {
                    // timeGranularity.format(t)
                    tickLabelFormat(t)
                  }
                </TickText>
              )}
            </g>
          );
        })}
        <AxisPath d={`M0,0 ${chartWidth},0`} />
        <AxisPath
          transform={`translate(0,${
            TOTAL_COUNT_CHART_HEIGHT + AXIS_AREA_HEIGHT
          })`}
          d={`M0,0 ${chartWidth},0`}
        />
        <g transform={`translate(0,${AXIS_AREA_HEIGHT})`}>
          {totalCountsByTime.map(({ time, count }) => (
            <Bar
              key={time.getTime()}
              x={timeScale(time)}
              y={TOTAL_COUNT_CHART_HEIGHT - totalCountScale(count)!}
              width={Math.max(
                timeScale(timeGranularity.interval.offset(time))! -
                  timeScale(time)! -
                  1,
                1
              )}
              height={totalCountScale(count)}
            />
          ))}
        </g>
      </g>
      <OuterRect ref={outerRectRef} width={width} height={SVG_HEIGHT} />
      <g transform={`translate(${margin.left},${margin.top})`}>
        <g transform={`translate(${timeScale(selectedTimeRange[0])},0)`}>
          <SelectedTimeRangeRect
            ref={selectedTimeRangeRectRef}
            height={TOTAL_COUNT_CHART_HEIGHT + AXIS_AREA_HEIGHT}
            width={
              timeScale(selectedTimeRange[1])! -
              timeScale(selectedTimeRange[0])!
            }
          />
        </g>
        <g
          transform={`translate(${timeScale(
            selectedTimeRange[0]
          )},${-handleHGap})`}
        >
          <TimelineHandle
            width={handleWidth}
            height={handleHeight}
            side="start"
            onMove={handleMoveSide}
          />
        </g>
        <g
          transform={`translate(${
            timeScale(selectedTimeRange[1])! - handleWidth
          },${-handleHGap})`}
        >
          <TimelineHandle
            width={handleWidth}
            height={handleHeight}
            side="end"
            onMove={handleMoveSide}
          />
        </g>
      </g>
    </TimelineSvg>
  );
};

function selectedTimeRangeToString(
  selectedTimeRange: [Date, Date],
  timeGranularityKey: TimeGranularityKey
) {
  const { interval, formatFull, order } = TIME_GRANULARITIES.find(
    (e) => e.key === timeGranularityKey
  )!;
  const start = selectedTimeRange[0];
  let end = selectedTimeRange[1];
  if (order >= 3) {
    end = interval.offset(end, -1);
  }
  if (end <= start) {
    end = start;
  }
  const startStr = formatFull(start);
  const endStr = formatFull(end);
  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr} - ${endStr}`;
}

const Timeline: React.FC<Props> = (props: Props) => {
  const [measureRef, dimensions] = useMeasure();
  const { extent, selectedTimeRange, timeGranularityKey, onChange } = props;
  const timeGranularity: TimeGranularity = TIME_GRANULARITIES.find(
    (e) => e.key === timeGranularityKey
  )!;
  const [internalTimeRange, setInternalTimeRange] =
    useState<[Date, Date]>(selectedTimeRange);
  const throttledTimeRange = useThrottle(internalTimeRange, 100);
  const onChangeRef = useRef<(range: [Date, Date]) => void>();
  onChangeRef.current = (range: [Date, Date]) => onChange(range);
  useEffect(() => {
    const { current } = onChangeRef;
    if (current) current(throttledTimeRange);
  }, [throttledTimeRange, onChangeRef]);

  const [prevSelectedTimeRange, setPrevSelectedTimeRange] =
    useState(selectedTimeRange);
  if (!areRangesEqual(selectedTimeRange, prevSelectedTimeRange)) {
    setInternalTimeRange(selectedTimeRange);
    setPrevSelectedTimeRange(selectedTimeRange);
  }

  const [isPlaying, setPlaying] = useState(false);

  const handlePlay = () => {
    const { interval } = timeGranularity;
    if (selectedTimeRange[1] >= extent[1]) {
      const length = (interval as any).count(
        selectedTimeRange[0],
        selectedTimeRange[1]
      );
      setInternalTimeRange([extent[0], interval.offset(extent[0], length)]);
    }
    setPlaying(true);
  };

  const handlePlayAdvance = (start: Date) => {
    const { interval } = timeGranularity;
    const length = (interval as any).count(
      selectedTimeRange[0],
      selectedTimeRange[1]
    );
    const end = interval.offset(start, length);
    if (end >= extent[1]) {
      setPlaying(false);
      setInternalTimeRange([interval.offset(end, -length), end]);
    } else {
      setInternalTimeRange([start, end]);
    }
  };

  const handleMove = (range: [Date, Date]) => {
    setInternalTimeRange(range);
    setPlaying(false);
  };

  return (
    <Absolute bottom={20} left={200} right={200}>
      <Column spacing={10}>
        <SelectedTimeRangeBox>
          {selectedTimeRangeToString(selectedTimeRange!, timeGranularityKey!)}
        </SelectedTimeRangeBox>
        <TimelineBox>
          <Outer>
            <PlayControl
              extent={extent}
              current={internalTimeRange[0]}
              interval={timeGranularity.interval}
              stepDuration={100}
              speed={1}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onPause={() => setPlaying(false)}
              onAdvance={handlePlayAdvance}
            />
            <MeasureTarget ref={measureRef as any}>
              {dimensions.width > 0 && (
                <TimelineChart
                  {...props}
                  selectedTimeRange={internalTimeRange}
                  width={dimensions.width}
                  onChange={handleMove}
                />
              )}
            </MeasureTarget>
          </Outer>
        </TimelineBox>
      </Column>
    </Absolute>
  );
};

export default Timeline;
