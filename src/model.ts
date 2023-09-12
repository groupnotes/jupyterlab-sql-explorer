import {ISignal, Signal} from '@lumino/signaling';
import {
    load_tree_root, load_tree_db_node, load_tree_table_node, load_tree_col_node, 
    set_pass, clear_pass,
    query, get_query, stop_query,
    edit_conn
} from './handler';
import {IDbItem, IPass, ITreeCmdRes, TApiStatus, IQueryRes, IDBConn } from './interfaces'

export class SqlModel {

    constructor(init?:Array<IDbItem>) {
        if (init) this._item_list=init
    }       
    
    refresh(path:IDbItem[]) {
        if (path.length==0) {
            this._item_list=[]
            return
        }
        let cur_list=this._item_list
        let pptr=this._item_list[0]
        for ( var p of path ) {
            let find=false
            for(let i=0; i<cur_list.length; i++) {
                if (cur_list[i].name==p.name) {
                    if (cur_list[i].next===false || !('next' in cur_list[i])) {
                        return;
                    }
                    find=true
                    pptr=cur_list[i]
                    cur_list = cur_list[i].next as IDbItem[]
                }
            }
            if (!find) return
        }
        pptr.next=false
        return
    }
    
    load_path = async (path:IDbItem[]): Promise<boolean> =>{
        
        let cur_list:IDbItem[] = this._item_list
        
        if (cur_list.length==0) {
            const res = await load_tree_root()
            if (res.status == 'NEED-PASS') {
                // send as signal to triger passwd input
                this._need_passwd.emit(res.pass_info as IPass)
                return false
            }
            if (res.status != 'OK')  return false
            this._item_list=cur_list = res.data as IDbItem[]
        }
        
        let dbid:string='';
        let db:string='';
        let tbl:string='';
        
        if (path.length>0) dbid=path[0].name
        if (path.length>1) {
            if (path[1].type=='db') {
                db=path[1].name
                if (path.length>2) tbl=path[2].name
            }else{
                db=''
                tbl=path[1].name
            }
        }
        
        for ( var p of path ) {
            for(let i=0; i<cur_list.length; i++) {
                if (cur_list[i].name==p.name) {
                    if (cur_list[i].next===false || !('next' in cur_list[i])) {
                        let res!: ITreeCmdRes
                        if (p.type=='conn') res=await load_tree_db_node(dbid)
                        if (p.type=='db') res = await load_tree_table_node(dbid, db)
                        if (p.type=='table') res = await load_tree_col_node(dbid, db, tbl)
                        if (res.status == 'NEED-PASS') {
                            // send as signal to triger passwd input
                            cur_list[i].next=false
                            this._need_passwd.emit(res.pass_info as IPass)
                            return false
                        }
                        if (res.status != 'OK')  {
                            cur_list[i].next=false
                            return false
                        }
                        cur_list[i].next = res.data
                    }
                    cur_list = cur_list[i].next as IDbItem[]
                }
            }
        }
        return true
    }
    
    get_list(path:IDbItem[]): IDbItem[]{
        let cur_list:IDbItem[] = this._item_list
        if (!cur_list) return []
        for ( var p of path ) {
            let find=false
            for(let i=0; i<cur_list.length; i++) {
                if (cur_list[i].name==p.name) {
                    if (cur_list[i].next===false) {
                        return []
                    }
                    find=true
                    cur_list = cur_list[i].next as IDbItem[]
                    if (!cur_list) return []
                }
            }
            if (!find) return[]
        }
        return cur_list.map(({name, desc, type})=>({name, desc, type} as IDbItem))
    }
    
    add_conn = async (conn:IDBConn)=>{
        console.log(conn)
        let rc = await edit_conn(conn)
        if (rc.status=='OK') {
           this.conn_changed.emit(conn.db_id) 
        }else{
           //this.need_passwd.emit(pass_info)
        }
    }
    
    set_pass = async (pass_info:IPass)=>{
        let rc = await set_pass(pass_info)
        if (rc.status=='OK') {
           this.passwd_settled.emit(pass_info.db_id) 
        }else{
           //send a message passwd error and retry
           this.need_passwd.emit(pass_info)
        }
    }
    
    clear_pass= async ()=>{
        await clear_pass()  
    }
    
    get need_passwd() {
        return this._need_passwd
    }
    
    get passwd_settled() {
        return this._passwd_settled
    }
    
    get conn_changed() {
        return this._conn_changed
    }

    private _item_list:IDbItem[]=[]
    private _need_passwd = new Signal<SqlModel, IPass>(this);
    private _passwd_settled = new Signal<SqlModel, string>(this);
    private _conn_changed = new Signal<SqlModel, string>(this);
}

/**
 * model for stop query info 
 */

export interface IQueryStatus {
    status : TApiStatus,
    errmsg ?: string
}

export interface IQueryModel {
    dbid  : string, 
    table : string,
    query : (sql:string)=>Promise<IQueryRes>,
    stop  : ()=>void,
    query_begin : ISignal<IQueryModel, void>,
    query_finish : ISignal<IQueryModel, IQueryStatus>
}

export class QueryModel implements IQueryModel {
    
    constructor(dbid:string, table:string) {
        this._dbid=dbid
        this._table=table
    }
    
    async query(sql: string):Promise<IQueryRes> {
        this._controller = new AbortController();
        this._query_begin.emit()
        const options = { signal: this._controller.signal };
        let rc = await query(this.dbid, this.table, sql, options)
        while(rc.status=='RETRY') {
            this._taskid = rc.data as string, 
            rc = await get_query(this._taskid, options)
        }
        const st:IQueryStatus = { status: rc.status, errmsg: rc.message}
        this._query_finish.emit(st)
        return rc
    }
    
    stop=()=>{
        this._controller.abort();
        stop_query(this._taskid)
    }
    
    get dbid() {
        return this._dbid
    }
    
    get table() {
        return this._table
    }
    
    get query_begin():ISignal<IQueryModel, void>{
        return this._query_begin
    }
    
    get query_finish():ISignal<IQueryModel, IQueryStatus> {
        return this._query_finish
    }
        
    private _dbid : string;
    private _table: string;
    private _taskid!: string;
    
    private _query_begin = new Signal<IQueryModel, void>(this);
    private _query_finish = new Signal<IQueryModel, IQueryStatus>(this);
    private _controller!: AbortController;
}