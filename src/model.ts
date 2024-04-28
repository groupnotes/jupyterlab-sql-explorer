import { ISignal, Signal } from '@lumino/signaling';
import {
  load_tree_root,
  load_tree_db_node,
  load_tree_table_node,
  load_tree_col_node,
  set_pass,
  clear_pass,
  query,
  get_query,
  stop_query,
  edit_conn,
  del_conn,
  add_comment
} from './handler';
import {
  IDbItem,
  IPass,
  ITreeCmdRes,
  TApiStatus,
  IQueryRes,
  IDBConn,
  IComment
} from './interfaces';

let sqlModelInst: SqlModel;

export function getSqlModel(): SqlModel {
  if (!sqlModelInst) {
    sqlModelInst = new SqlModel();
  }
  return sqlModelInst;
}

export class SqlModel {
  constructor(init?: Array<IDbItem>) {
    if (init) {
      this._item_list = init;
    }
  }

  refresh(path: IDbItem[]): void {
    if (path.length === 0) {
      this._item_list = [];
      return;
    }
    let cur_list = this._item_list;
    let pptr = this._item_list[0];
    for (const p of path) {
      let find = false;
      for (let i = 0; i < cur_list.length; i++) {
        if (cur_list[i].name === p.name) {
          if (cur_list[i].next === false || !('next' in cur_list[i])) {
            return;
          }
          find = true;
          pptr = cur_list[i];
          cur_list = cur_list[i].next as IDbItem[];
        }
      }
      if (!find) {
        return;
      }
    }
    pptr.next = false;
    return;
  }

  load_path = async (path: IDbItem[]): Promise<boolean> => {
    let cur_list: IDbItem[] = this._item_list;

    if (cur_list.length === 0) {
      const res = await load_tree_root();
      if (res.status === 'NEED-PASS') {
        // send as signal to triger passwd input
        this._need_passwd.emit(res.pass_info as IPass);
        return false;
      }
      if (res.status !== 'OK') {
        return false;
      }
      this._item_list = cur_list = res.data as IDbItem[];
    }

    let dbid = '';
    let db = '';
    let tbl = '';

    if (path.length > 0) {
      dbid = path[0].name;
    }
    if (path.length > 1) {
      if (path[1].type === 'db') {
        db = path[1].name;
        if (path.length > 2) {
          tbl = path[2].name;
        }
      } else {
        db = '';
        tbl = path[1].name;
      }
    }

    for (const p of path) {
      for (let i = 0; i < cur_list.length; i++) {
        if (cur_list[i].name === p.name) {
          if (cur_list[i].next === false || !('next' in cur_list[i])) {
            let res!: ITreeCmdRes;
            if (p.type === 'conn') {
              res = await load_tree_db_node(dbid);
            }
            if (p.type === 'db') {
              res = await load_tree_table_node(dbid, db);
              console.log(res);
            }
            if (p.type === 'table') {
              res = await load_tree_col_node(dbid, db, tbl);
            }
            if (res.status === 'NEED-PASS') {
              // send as signal to triger passwd input
              cur_list[i].next = false;
              this._need_passwd.emit(res.pass_info as IPass);
              return false;
            }
            if (res.status !== 'OK') {
              cur_list[i].next = false;
              return false;
            }
            cur_list[i].next = res.data;
          }
          cur_list = cur_list[i].next as IDbItem[];
        }
      }
    }
    return true;
  };

  get_list(path: IDbItem[]): IDbItem[] {
    let cur_list: IDbItem[] = this._item_list;
    if (!cur_list) {
      return [];
    }
    for (const p of path) {
      let find = false;
      for (let i = 0; i < cur_list.length; i++) {
        if (cur_list[i].name === p.name) {
          if (cur_list[i].next === false) {
            return [];
          }
          find = true;
          cur_list = cur_list[i].next as IDbItem[];
          if (!cur_list) {
            return [];
          }
        }
      }
      if (!find) {
        return [];
      }
    }
    return cur_list.map(
      ({ name, desc, type, subtype, fix }) =>
        ({ name, desc, type, subtype, fix }) as IDbItem
    );
  }

  add_conn = async (conn: IDBConn): Promise<void> => {
    const rc = await edit_conn(conn);
    if (rc.status === 'OK') {
      const { name, db_id } = conn;
      this._item_list.push({
        type: 'conn',
        name: db_id,
        desc: name,
        subtype: parseInt(conn.db_type),
        next: false
      });
      this.conn_changed.emit(conn.db_id);
    } else {
      conn.errmsg = rc.message || '';
      this.create_conn.emit(conn);
    }
  };

  del_conn = async (dbid: string): Promise<void> => {
    const rc = await del_conn(dbid);
    if (rc.status === 'OK') {
      const idx = this._item_list.findIndex(o => o.name === dbid);
      if (idx >= 0) {
        this._item_list.splice(idx, 1);
      }
      this.conn_changed.emit(dbid);
    } else {
      //this.need_passwd.emit(pass_info)
    }
  };

  set_pass = async (pass_info: IPass): Promise<void> => {
    const rc = await set_pass(pass_info);
    if (rc.status === 'OK') {
      this.passwd_settled.emit(pass_info.db_id);
    } else {
      //send a message passwd error and retry
      this.need_passwd.emit(pass_info);
    }
  };

  clear_pass = async (dbid?: string): Promise<void> => {
    await clear_pass(dbid);
  };

  add_comment = async (data: IComment): Promise<void> => {
    const rc = await add_comment(data);
    if (rc.status === 'OK') {
      //         const function find_node(cur_list, name) {
      //             for (let i = 0; i < cur_list.length; i++) {
      //                 if (cur_list[i].name === name)
      //                     return cur_list
      //             }
      //             return false
      //         }

      //         let cur_list: IDbItem[] = this._item_list;
      //         if (data.dbid) cur_list = find_node(cur_list, data.dbid)
      //         if (cur_list===false) return
      //         if (data.schema) cur_list = find_node(cur_list, data.schema)
      //         if (cur_list===false) return
      //         if (data.table) cur_list = find_node(cur_list, data.table)
      //         if (cur_list===false) return
      //         if (data.column) cur_list = find_node(cur_list, data.column)
      //         if (cur_list===false) return

      //         cur_list.desc =  data.comment
      this.comment_change.emit();
    } else {
      alert(rc.message);
    }
  };

  get need_passwd(): Signal<SqlModel, IPass> {
    return this._need_passwd;
  }

  get passwd_settled(): Signal<SqlModel, string> {
    return this._passwd_settled;
  }

  get conn_changed(): Signal<SqlModel, string> {
    return this._conn_changed;
  }

  get create_conn(): Signal<SqlModel, IDBConn> {
    return this._conn_create;
  }

  get comment_change(): Signal<SqlModel, void> {
    return this._comment_change;
  }

  private _item_list: IDbItem[] = [];
  private _need_passwd = new Signal<SqlModel, IPass>(this);
  private _passwd_settled = new Signal<SqlModel, string>(this);
  private _conn_changed = new Signal<SqlModel, string>(this);
  private _conn_create = new Signal<SqlModel, IDBConn>(this);
  private _comment_change = new Signal<SqlModel, void>(this);
}

/**
 * model for stop query info
 */

export interface IQueryStatus {
  status: TApiStatus;
  errmsg?: string;
}

export interface IQueryModel {
  dbid: string;
  schema?: string;
  query: (sql: string) => Promise<IQueryRes>;
  conns: Array<string>;
  isConnReadOnly: boolean;
  stop: () => void;
  query_begin: ISignal<IQueryModel, void>;
  query_finish: ISignal<IQueryModel, IQueryStatus>;
}

export interface IQueryModelOptions {
  dbid?: string;
  schema?: string;
  conn_readonly?: boolean;
}

export class QueryModel implements IQueryModel {
  constructor(options: IQueryModelOptions) {
    this._dbid = options.dbid || '';
    this._schema = options.schema;
    this._conn_readonly = !!options.conn_readonly;
    this._running = false;
  }

  async query(sql: string): Promise<IQueryRes> {
    if (this._running) {
      return { status: 'ERR', message: 'has running' };
    }
    if (!this._dbid) {
      const st: IQueryStatus = {
        status: 'ERR',
        errmsg: 'please select the db connnection first!'
      };
      this._query_finish.emit(st);
      return { status: 'ERR' };
    }
    this._running = true;
    this._controller = new AbortController();
    this._query_begin.emit();
    const options = { signal: this._controller.signal };
    let rc = await query(sql, this.dbid, this.schema, options);
    if (rc.status === 'NEED-PASS') {
      // send as signal to triger passwd input
      getSqlModel().need_passwd.emit(rc.pass_info as IPass);
      this._running = false;
      const st: IQueryStatus = {
        status: rc.status,
        errmsg: 'please input passwd and try again'
      };
      this._query_finish.emit(st);
      return rc;
    }
    while (rc.status === 'RETRY') {
      (this._taskid = rc.data as string),
        (rc = await get_query(this._taskid, options));
    }
    const st: IQueryStatus = { status: rc.status, errmsg: rc.message };
    this._query_finish.emit(st);
    this._running = false;
    return rc;
  }

  get conns(): Array<string> {
    const model = getSqlModel();
    return model.get_list([]).map(o => o.name);
  }

  stop = (): void => {
    this._controller.abort();
    stop_query(this._taskid);
  };

  get dbid(): string {
    return this._dbid;
  }

  set dbid(dbid: string) {
    if (this._conn_readonly || this._running) {
      return;
    }
    this._dbid = dbid;
    getSqlModel().conn_changed.emit(dbid);
  }

  get schema(): string | undefined {
    return this._schema;
  }

  get query_begin(): ISignal<IQueryModel, void> {
    return this._query_begin;
  }

  get query_finish(): ISignal<IQueryModel, IQueryStatus> {
    return this._query_finish;
  }

  get isConnReadOnly(): boolean {
    return this._conn_readonly;
  }

  private _running: boolean;
  private _dbid: string;
  private _schema?: string;
  private _taskid!: string;

  private _query_begin = new Signal<IQueryModel, void>(this);
  private _query_finish = new Signal<IQueryModel, IQueryStatus>(this);
  private _controller!: AbortController;

  private _conn_readonly: boolean; /* can change db connection */
}
