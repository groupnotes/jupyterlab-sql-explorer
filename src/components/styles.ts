import { style } from 'typestyle';

export const tbStyle = style({
    padding: 10,
    paddingBottom: 0
})

export const listStyle = style({
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    height: "calc(100% - 120px)",
    overflow: "auto",
    $nest: {
      '&>li': {
         marginTop: 2,
         padding: 4,
         paddingLeft:10,
         paddingRight:10,
         userSelect: 'none',
         $nest: {
             '&:hover': {
                 backgroundColor:'#ddd'
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
         overflow : 'hidden',
         display: 'inline-flex',
         textOverflow: 'ellipsis'
       },
      '&>li>.memo': {
         marginRight: 5,
       }
    }
});