import * as React from 'react';
import { TranslationBundle } from '@jupyterlab/translation';
import { refreshIcon } from '@jupyterlab/ui-components'
import { FixedSizeList as List } from 'react-window';
import { Loading } from './loading';
import AutoSizer from "../auto_resizer";

import { IDbItem } from '../interfaces'
import { connIcon, sqlIcon, tabIcon, connAddIcon } from '../icons';
import { tbStyle, listStyle, hrStyle, divListStyle} from './styles';
import { ActionBtn } from './ActionBtn'

type SelectFunc=(item : IDbItem)=>(ev: React.MouseEvent<HTMLLIElement|HTMLDivElement, MouseEvent>)=>Promise<void>

type ListProps = {
    trans : TranslationBundle,
    onSelect : SelectFunc,
    list : Array<IDbItem>,
    onRefresh : ()=>any,
    filter: string,
    wait?: boolean
}

type ConnListProps= ListProps & { onAddConn: ()=>any}

export const ConnList : React.FC<ConnListProps> = ({trans, onSelect, list, onAddConn, onRefresh, filter}): React.ReactElement => {
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
                <li key={idx} onClick={onSelect(p)} title={p.name+'\n'+p.desc} >
                    <connIcon.react tag="span" width="16px" height="16px"/>
                    <span className='name'>{p.name}</span>
                    <span className='memo'>{p.desc}</span></li>)}
            </ul>
        </>
    )
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
