import styled from "@emotion/styled";
import { Colors } from "@blueprintjs/core";
import { opacifyHex } from "@flowmap.gl/data";

export interface AbsoluteProps {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

function isNumber(x: any): x is number {
  return typeof x === "number";
}

type ColumnProps = { spacing?: number; padding?: number | string };
export const Column = styled.div<ColumnProps>(
  ({ spacing = 0, padding = 0 }: ColumnProps) => `
  display: flex;
  flex-direction: column;
  padding: ${isNumber(padding) ? `${padding}px` : padding};
  & > * + * { margin-top: ${spacing}px; }
`
);

type RowProps = { spacing?: number };
export const Row = styled.div<RowProps>(
  ({ spacing = 0 }: RowProps) => `
  display: flex;
  flex-direction: row;
  align-items: center;
  & > * + * { margin-left: ${spacing}px; }
`
);

export const Absolute = styled.div<AbsoluteProps>(
  ({ top, left, right, bottom }: AbsoluteProps) => `
  position: absolute;
  ${top !== null ? `top: ${top}px;` : ""}
  ${left !== null ? `left: ${left}px;` : ""}
  ${right !== null ? `right: ${right}px;` : ""}
  ${bottom !== null ? `bottom: ${bottom}px;` : ""}
`
);

export const getBoxStyle = () => `
  background: ${opacifyHex(`rgba(255, 255, 255, 0.9)`, 0.8)};
  border-radius: 4px;
  font-size: 11px;
  box-shadow: 0 0 5px #aaa; 
`;
export const BoxStyle = styled.div(getBoxStyle);

export const Box = styled(Absolute)(getBoxStyle);

export const SelectedTimeRangeBox = styled(BoxStyle)({
  display: "flex",
  alignSelf: "center",
  fontSize: 12,
  padding: "5px 10px",
  borderRadius: 5,
  backgroundColor: Colors.LIGHT_GRAY4,
  textAlign: "center",
});

export const TimelineBox = styled(BoxStyle)({
  minWidth: 400,
  display: "block",
  boxShadow: "0 0 5px #aaa",
  borderTop: "1px solid #999",
});
