import { style, keyframes } from 'typestyle';

export const tbStyle = style({
  padding: 10,
  paddingBottom: 0
});

export const activeStyle = style({
  color: 'var(--jp-ui-inverse-font-color1)',
  background: 'var(--jp-brand-color1)'
});

export const listStyle = style({
  listStyleType: 'none',
  margin: 0,
  padding: 0,
  height: 'calc(100% - 120px)',
  overflow: 'auto',
  $nest: {
    '&>li': {
      marginTop: 2,
      padding: 4,
      paddingLeft: 10,
      paddingRight: 10,
      userSelect: 'none',
      $nest: {
        [`&:hover:not(.${activeStyle})`]: {
          background: 'var(--jp-layout-color2)'
        },

        '&:active': {
          backgroundColor: '#1072ae99'
        }
      }
    },
    '&>li>span:first-child': {
      marginRight: 5,
      verticalAlign: 'text-top'
    },
    '&>li>.name': {
      marginRight: 5,
      fontWeight: 'bold',
      maxWidth: '80%',
      overflow: 'hidden',
      display: 'inline-flex',
      textOverflow: 'ellipsis'
    },
    '&>li>.memo': {
      marginRight: 5
    },
    '&>li>input': {
      verticalAlign: 'middle'
    },

    [`&>li.${activeStyle} .jp-icon-selectable[fill]`]: {
      fill: '#fff'
    }
  }
});

export const divListStyle = style({
  margin: 0,
  padding: 0,
  paddingLeft: 10,
  paddingRight: 10,
  userSelect: 'none',
  lineHeight: '25px',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  $nest: {
    '&:hover': {
      background: 'var(--jp-layout-color2)'
    },
    '&>span:first-child': {
      marginRight: 5
      //verticalAlign: 'text-top'
    },
    '&>.name': {
      marginRight: 5,
      fontWeight: 'bold',
      maxWidth: '80%',
      overflow: 'hidden',
      display: 'inline-flex',
      textOverflow: 'ellipsis'
    },
    '&>.memo': {
      marginRight: 5
    }
  }
});

// for dialog width 300px
export const dlgStyle300 = style({
  width: 300,
  $nest: {
    '& input': {
      width: '100%'
    }
  }
});

export const hrStyle = style({
  border: 'none',
  borderTop: '1px solid #bbb',
  margin: '3px 0',
  padding: 0
});

export const spinStyle = keyframes({
  '100%': {
    transform: 'rotate(360deg)'
  }
});

export const loadingStyle = style({
  boxSizing: 'border-box',
  width: '12px',
  height: '12px',
  borderRadius: '100%',
  border: '2px solid rgba(0, 0, 0, 0.4)',
  borderTopColor: '#FFF',
  animationName: spinStyle,
  animationDuration: '1s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
  marginLeft: 10,
  marginRight: 10,
  marginTop: 6
});
