import {Signal} from '@lumino/signaling';
import {load_tree_root, load_tree_db_node, load_tree_table_node, load_tree_col_node } from './handler';
import {IDbItem, IPass, ITreeCmdRes } from './interfaces'

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
                    if (cur_list[i].next===false) {
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
                            this._need_passwd.emit(res.pass_info as IPass)
                            return false
                        }
                        if (res.status != 'OK')  return false
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
    
    get need_passwd() {
        return this._need_passwd
    }

    private _item_list:IDbItem[]=[]
    private _need_passwd = new Signal<SqlModel, IPass>(this);
}