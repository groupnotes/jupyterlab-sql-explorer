import { LabIcon } from '@jupyterlab/ui-components';

import sqlSvg from '../style/icons/sql.svg';
import connSvg from '../style/icons/conn.svg';
import tabSvg from '../style/icons/table.svg';
import viewSvg from '../style/icons/view.svg';
import rootSvg from '../style/icons/root.svg';
import colSvg from '../style/icons/column.svg';
import querySvg from '../style/icons/query.svg';
import connAddSvg from '../style/icons/conn-add.svg';
import errorSvg from '../style/icons/error.svg';
import deleteSvg from '../style/icons/delete.svg';
import sqlScSvg from '../style/icons/sql_script.svg';
import hiveSvg from '../style/icons/hive.svg';
import pgsqlSvg from '../style/icons/pgsql.svg';
import mysqlSvg from '../style/icons/mysql.svg';
import sqliteSvg from '../style/icons/sqlite.svg';
import oracleSvg from '../style/icons/oracle.svg';

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

export const viewIcon = new LabIcon({
  name: 'sql-explorer:view',
  svgstr: viewSvg
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

export const hiveIcon = new LabIcon({
  name: 'sql-explorer:hive',
  svgstr: hiveSvg
});

export const pgsqlIcon = new LabIcon({
  name: 'sql-explorer:pgsql',
  svgstr: pgsqlSvg
});

export const mysqlIcon = new LabIcon({
  name: 'sql-explorer:mysql',
  svgstr: mysqlSvg
});

export const sqliteIcon = new LabIcon({
  name: 'sql-explorer:sqlite',
  svgstr: sqliteSvg
});

export const oracleIcon = new LabIcon({
  name: 'sql-explorer:oracle',
  svgstr: oracleSvg
});

export const deleteIcon = new LabIcon({
  name: 'sql-explorer:del',
  svgstr: deleteSvg
});
