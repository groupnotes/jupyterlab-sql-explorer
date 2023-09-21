import { LabIcon } from '@jupyterlab/ui-components';

import sqlSvg from '../style/icons/sql.svg';
import connSvg from '../style/icons/conn.svg';
import tabSvg from '../style/icons/table.svg';
import rootSvg from '../style/icons/root.svg';
import colSvg from '../style/icons/column.svg';
import querySvg from '../style/icons/query.svg';
import connAddSvg from '../style/icons/conn-add.svg';
import errorSvg from '../style/icons/error.svg';
import sqlScSvg from '../style/icons/sql_script.svg';

export const sqlIcon = new LabIcon({
  name: 'sql-explorer',
  svgstr: sqlSvg
});

export const sqlScIcon = new LabIcon({
  name: 'sql-explorer:file',
  svgstr: sqlScSvg
});

export const connIcon = new LabIcon({
  name: 'sql-explorer:conn',
  svgstr: connSvg
});

export const tabIcon = new LabIcon({
  name: 'sql-explorer:tab',
  svgstr: tabSvg
});

export const rootIcon = new LabIcon({
  name: 'sql-explorer:dbroot',
  svgstr: rootSvg
});

export const colIcon = new LabIcon({
  name: 'sql-explorer:col',
  svgstr: colSvg
});

export const queryIcon = new LabIcon({
  name: 'sql-explorer:query',
  svgstr: querySvg
});

export const connAddIcon = new LabIcon({
  name: 'sql-explorer:db-add',
  svgstr: connAddSvg
});

export const errorIcon = new LabIcon({
  name: 'sql-explorer:error',
  svgstr: errorSvg
});
