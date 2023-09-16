import * as React from 'react';
import { Menu } from '@lumino/widgets';
import { CommandRegistry } from '@lumino/commands';
import { Clipboard } from '@jupyterlab/apputils';
import { refreshIcon } from '@jupyterlab/ui-components'
//import { newQuery } from '../QueryWidget'
import { newSqlConsole } from '../sqlConsole'
import { style } from 'typestyle';
import { IDbItem } from '../interfaces'
import { queryIcon } from '../icons';
import { tbStyle, listStyle, hrStyle } from './styles';
import { ActionBtn } from './ActionBtn'
import { IJpServices } from '../JpServices';
import { QueryModel} from '../model';
import { Loading } from './loading';

const chkStyle = style({
    padding: "2px 5px 2px 0px",
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '2px',
    $nest : {
        '&:hover': {
            backgroundColor: '#ddd',
        },
        '&:active': {
            backgroundColor: '#bbb'
        }
    }
})

type TColProps={
    jp_services : IJpServices,
    list : Array<IDbItem>,
    filter: string,
    dbid : string,
    schema : string,
    table : string,
    onRefresh: ()=>any,
    wait?: boolean
}

type TColState={
    checked: Set<string>
}

/**
 * React component for rendering a panel for performing Table operations.
 */
export class ColList extends React.Component<TColProps, TColState> {
    
    constructor(props:TColProps) {
        super(props)
        this._contextMenu = this._createContextMenu();
        this.state={
            checked: new Set()
        }
    }
    
    private _createContextMenu(): Menu {
        const commands = new CommandRegistry();
        const copy='copyName'
        const copy_all='copyAll'
        commands.addCommand(copy, {
          label: 'Copy Column Name',
          iconClass: 'jp-MaterialIcon jp-CopyIcon',
          execute: this._copyToClipboard('n')
        });
        commands.addCommand(copy_all, {
          label: 'Copy Column & Comment',
          iconClass: 'jp-MaterialIcon jp-CopyIcon',
          execute: this._copyToClipboard('all')
        });
        const menu = new Menu({ commands });
        menu.addItem({ command: copy});
        menu.addItem({ command: copy_all});
        return menu;
    }
        
    render(): React.ReactElement {
        const {jp_services, list, filter, wait, onRefresh}=this.props
        const {trans}=jp_services
        const {checked}=this.state
        const all = new Set<string>(list.map(p=>p.name))
        return (
        <>
            <div className={tbStyle}>
                <div onClick={this._select_all} className={chkStyle} >
                   <input type='checkbox' checked={checked.size==all.size && all.size!=0} disabled={filter!=''}/>
                   <span>{checked.size==all.size?trans.__("Select None"):trans.__("Select All")}</span>
                </div>
                <div style={{float:'right'}}>
                    <ActionBtn msg={trans.__('open sql console')} icon={queryIcon} 
                        onClick={this._sql_query}/>
                    <ActionBtn msg={trans.__('refresh')} icon={refreshIcon} onClick={onRefresh} />
                </div>
                <div style={{clear:'both'}}/>
                <hr className={hrStyle}/>
            </div>
            { wait? <Loading /> :
                <ul className={listStyle}>
                { list.filter(
                     p=>p.name.toLowerCase().includes(filter) || 
                     (p.desc && p.desc.toLowerCase().includes(filter))
                  ).map(p=>
                    <li onClick={this._onSelect(p)} title={p.name+'\n'+p.desc}  
                        onContextMenu={(event) => this._handleContextMenu(event, p)}
                        >
                        <input type='checkbox' checked={checked.has(p.name)} />
                        <span className='name'>{p.name}</span>
                        <span className='memo'>{p.desc}</span></li>)}

                </ul>
             }
        </>)
    }
    
    private _handleContextMenu = (event:React.MouseEvent<any>, item:IDbItem) => {
        event.preventDefault();
        this._sel_item = item
        this._contextMenu.open(event.clientX, event.clientY);
    }
    
    private _copyToClipboard=(t:string)=>()=>{
        const {name, desc}=this._sel_item
        if (t=='all' && desc!='') Clipboard.copyToSystem(`${name} /* ${desc} */`);
        else Clipboard.copyToSystem(name);
    }
    
    private _select_all=async (ev: any)=>{
        let {checked}=this.state
        const {list, filter}=this.props
        if (filter!='') return
        if (checked.size==list.length) {
            checked.clear()
        }else{
            checked=new Set<string>(list.map(p=>p.name))
        }
        this.setState({checked})
    }
    
    private _onSelect=(item: IDbItem)=>async (ev: React.MouseEvent<HTMLLIElement, MouseEvent>)=>{
        let {checked}=this.state
        let {name}=item
        if (checked.has(name)) {
            checked.delete(name)
        }else{
            checked.add(name)
        }
        this.setState({checked})
    }
        
    private _sql_query = ( ev: any) => {
        let {checked}=this.state
        const {dbid, schema, table, list}=this.props
        
        const col_names:{[key: string]:string}=list.reduce((acc, {name, desc}) => ({...acc, [name]: desc}), {});
        
        let sql:string='SELECT '
        if (checked.size==0) {
            sql +="*"
        }else{
            let cols=new Array<string>()
            checked.forEach(c=>cols.push(`    t.${c} /* ${col_names[c]} */`))
            sql += '\n' + cols.join(',\n') 
        }
        sql += "\nFROM " + (schema!=''?schema+'.':'')+table + " t LIMIT 200"
        const qmodel=new QueryModel({dbid, conn_readonly:true})
        newSqlConsole(qmodel, sql, this.props.jp_services)
    }
    
    private readonly _contextMenu: Menu;
    private _sel_item!: IDbItem;
}