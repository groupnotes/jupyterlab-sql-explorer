import * as React from 'react';
import { style } from 'typestyle';

export const btnStyle = style({
  border: 'none',
  padding: '4px 5px 0px 5px',
  backgroundColor: 'transparent',
  $nest: {
    '&:hover': {
      backgroundColor: '#ddd'
    },
    '&:active': {
      backgroundColor: '#bbb'
    }
  }
});

type ClickFunc = (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => any;

type BtnProps = {
  onClick: ClickFunc;
  icon: any;
  style?: { [key: string]: any };
  msg?: string;
};

export const ActionBtn: React.FC<BtnProps> = ({
  onClick,
  icon,
  style,
  msg
}): React.ReactElement => {
  return (
    <button className={btnStyle} title={msg} onClick={onClick} style={style}>
      <icon.react tag="span" width="16px" height="16px" />
    </button>
  );
};
