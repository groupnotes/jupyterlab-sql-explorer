export enum ConnType {
  DB_MYSQL = 1,
  DB_PGSQL = 2,
  DB_ORACLE = 3,
  DB_HIVE_LDAP = 4,
  DB_HIVE_KERBEROS = 5,
  DB_SQLITE = 6
}

export interface IDbItem {
  type: string;
  name: string;
  subtype?: ConnType | string;
  fix?: boolean;
  desc?: string;
  next?: IDbItem[] | false;
}

export interface IDBConn {
  db_id: string;
  db_type: string;
  db_name?: string;
  db_host?: string;
  db_port?: string;
  db_user?: string;
  db_pass?: string;
  name?: string;
  errmsg?: string;
}

export interface IPass {
  db_id: string;
  db_user: string;
  db_pass: string;
}

export type TApiStatus = 'OK' | 'NEED-PASS' | 'RETRY' | 'ERR';

export interface IParam {
  [key: string]: string | number | null;
}

export interface IApiRes<T> {
  status: TApiStatus;
  pass_info?: IPass; // if status if NEED_PASS,
  message?: string;
  data?: T;
}

export interface ITreeCmdRes {
  status: TApiStatus;
  message?: string;
  data?: Array<IDbItem>;
  pass_info?: IPass; // if status if NEED_PASS,
}

export interface ITableData {
  columns: Array<string>;
  data: Array<Array<any>>;
}

export interface IQueryRes {
  status: TApiStatus;
  data?: ITableData | string;
  message?: string;
  pass_info?: IPass; // if status if NEED_PASS,
}

export enum CommentType {
  C_CONN = '1',
  C_SCHEMA = '2',
  C_TABLE = '3',
  C_COLUMN = '4'
}

export interface IComment {
  type: CommentType;
  dbid: string;
  schema?: string;
  table?: string;
  column?: string;
  comment: string;
}
