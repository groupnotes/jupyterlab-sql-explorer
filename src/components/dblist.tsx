import * as React from 'react';
import { Menu } from '@lumino/widgets';
import { CommandRegistry } from '@lumino/commands';
import { TranslationBundle } from '@jupyterlab/translation';
import { refreshIcon, deleteIcon, clearIcon } from '@jupyterlab/ui-components'
import { FixedSizeList as List } from 'react-window';
import { Loading } from './loading';
import AutoSizer from "../auto_resizer";

import { IDbItem } from '../interfaces'
import { IJpServices } from '../JpServices';
import { queryIcon, connIcon, sqlIcon, tabIcon, connAddIcon } from '../icons';
import { tbStyle, listStyle, hrStyle, divListStyle} from './styles';
import { ActionBtn } from './ActionBtn'
import { getSqlModel, QueryModel } from '../model'
import { newSqlConsole} from '../sqlConsole'

type SelectFunc=(item : IDbItem)=>(ev: React.MouseEvent<HTMLLIElement|HTMLDivElement, MouseEvent>)=>Promise<void>

type ListProps = {
    onSelect : SelectFunc,
    list : Array<IDbItem>,
    onRefresh : ()=>any,
    filter: string,
    wait?: boolean,
    jp_services?:IJpServices,
    trans : TranslationBundle
}

type ConnListProps= ListProps & { onAddConn: ()=>any}

/**
 * React component for rendering a panel for performing Table operations.
 */
export class ConnList extends React.Component<ConnListProps> {
    
    constructor(props:ConnListProps) {
        super(props)
        this._contextMenu = this._createContextMenu();
    }
    
    private _createContextMenu(): Menu {
        const {trans}=this.props.jp_services as IJpServices;
        const commands = new CommandRegistry();
        const del='del'
        const clear_pass='clean-pass'
        const open_console='open-console'
        
        commands.addCommand(del, {
          label: trans.__('Del Connection'),
          //iconClass: 'jp-MaterialIcon jp-CopyIcon',
          icon: deleteIcon.bindprops({ stylesheet: 'menuItem' }),  
          execute: this._del_conn
        });
        
        commands.addCommand(clear_pass, {
          label: trans.__('Clear Passwd'),
          icon: clearIcon.bindprops({ stylesheet: 'menuItem' }), 
          execute: this._clear_pass
        });
        
        commands.addCommand(open_console, {
          label: trans.__('Open Sql Console'),
          icon: queryIcon.bindprops({ stylesheet: 'menuItem' }), 
          execute: this._open_console
        });
        
        const menu = new Menu({ commands });
        menu.addItem({ command: del});
        menu.addItem({ command: clear_pass});
        menu.addItem({ command: open_console});
        return menu;
    }

    render():React.ReactElement {
       const {onSelect, list, onAddConn, onRefresh, filter, jp_services}=this.props
       const {trans}=jp_services as IJpServices
       return (
        <>
            <div className={tbStyle}>
                <div style={{textAlign:'right'}}>
                    <ActionBtn msg={trans.__('Add new database connection')} icon={connAddIcon} onClick={onAddConn}/>
                    <ActionBtn msg={trans.__('refresh')} icon={refreshIcon} onClick={onRefresh} />
                </div>
                <hr className={hrStyle}/>
            </div>
            <ul className={listStyle}>
            { list.filter(p=>
                    p.name.toLowerCase().includes(filter) || 
                    (p.desc && p.desc.toLowerCase().includes(filter))
              ).map((p,idx)=>
                <li key={idx} onClick={onSelect(p)} title={p.name+'\n'+p.desc} 
                    onContextMenu={(event) => this._handleContextMenu(event, p)}>
                    <connIcon.react tag="span" width="16px" height="16px"/>
                    <span className='name'>{p.name}</span>
                    <span className='memo'>{p.desc}</span>
                    <span>
                        <connIcon.react tag="span" width="16px" height="16px"/>    
                    </span>
                </li>)}
            </ul>
        </>
      )
    }

    private _handleContextMenu = (event:React.MouseEvent<any>, item:IDbItem) => {
        this._sel_item = item
        this._contextMenu.open(event.clientX, event.clientY);
        event.preventDefault();
    }
    
    private _del_conn=async()=>{
        getSqlModel().del_conn(this._sel_item.name)
    }
    
    private _clear_pass=()=>{
        getSqlModel().clear_pass(this._sel_item.name) 
    }
    
    private _open_console=()=> {
        const qmodel=new QueryModel({dbid:this._sel_item.name, conn_readonly:true})
        newSqlConsole(qmodel, '',  this.props.jp_services as IJpServices)
    }
    
    private readonly _contextMenu: Menu;
    private _sel_item!: IDbItem;
}

export const DBList : React.FC<ListProps> = ({trans, onSelect, list, onRefresh, filter, wait}): React.ReactElement => {
    const l=list.filter(p=>
                     p.name.toLowerCase().includes(filter) || 
                     (p.desc && p.desc.toLowerCase().includes(filter))
            )
    const Row = ({index, style, data}:{index: number; style: React.CSSProperties;data:any}) =>{
        const p=data[index]
        return (<div key={index} style={style}  onClick={onSelect(p)} title={p.name+'\n'+p.desc} className={divListStyle}>
                     { p.type=='db' && <sqlIcon.react tag="span" width="16px" height="16px" verticalAlign="text-top"/> }
                     { p.type=='table' && <tabIcon.react tag="span" width="16px" height="16px" verticalAlign="text-top"/> }
                     <span className='name'>{p.name}</span>
                     <span className='memo'>{p.desc}</span></div>)
    }
    return (
        <>
            <div className={tbStyle}>
                <div style={{textAlign:'right'}}>
                    <ActionBtn msg={trans.__('refresh')} icon={refreshIcon} onClick={onRefresh} />
                </div>
                <hr className={hrStyle}/>
            </div>
            { wait? <Loading /> :
                <AutoSizer>
                { ({height, width}:{height:any; width:any})=>
                    <List
                        itemCount={l.length}
                        itemData={l}
                        itemSize={25}
                        height={height-120}
                        width={width}
                    >
                       {Row}
                    </List>}
                </AutoSizer>
             }
        </>
    )
}

export const TbList : React.FC<ListProps> = ({trans, onSelect, list, onRefresh, filter, wait}): React.ReactElement => {
    const l=list.filter(p=>
                     p.name.toLowerCase().includes(filter) || 
                     (p.desc && p.desc.toLowerCase().includes(filter))
            )
    const Row = ({index, style, data}:{index: number; style: React.CSSProperties;data:any}) =>{
        const p=data[index]
        return (<div key={index} style={style}  onClick={onSelect(p)} title={p.name+'\n'+p.desc} className={divListStyle}>
                     <tabIcon.react tag="span" width="14px" height="14px" right="5px" verticalAlign="text-top"/>
                     <span className='name'>{p.name}</span>
                     <span className='memo'>{p.desc}</span></div>)
    }
    return (
        <>
            <div className={tbStyle}>
                <div style={{textAlign:'right'}}>
                    <ActionBtn msg={trans.__('refresh')} icon={refreshIcon} onClick={onRefresh} />
                </div>
                <hr className={hrStyle}/>
            </div>
            {wait? <Loading/>:
                <AutoSizer>
                { ({height, width}:{height:any; width:any})=>
                    <List
                        itemCount={l.length}
                        itemData={l}
                        itemSize={25}
                        height={height-120}
                        width={width}
                    >
                       {Row}
                    </List>}
                </AutoSizer>
            }
        </>
    )
}
