import * as React from 'react';
import { TranslationBundle } from '@jupyterlab/translation';
import { IDbItem } from '../interfaces'
import { refreshIcon } from '@jupyterlab/ui-components'
import { connIcon, sqlIcon, tabIcon, connAddIcon } from '../icons';
import { tbStyle, listStyle } from './styles';
import { ActionBtn } from './ActionBtn'

type SelectFunc=(item : IDbItem)=>(ev: React.MouseEvent<HTMLLIElement, MouseEvent>)=>Promise<void>

type ListProps = {
    trans : TranslationBundle,
    onSelect : SelectFunc,
    list : Array<IDbItem>,
    onRefresh : ()=>any,
    filter: string
}

type ConnListProps= ListProps & { onAddConn: ()=>any}


export const ConnList : React.FC<ConnListProps> = ({trans, onSelect, list, onAddConn, onRefresh}): React.ReactElement => {
    return (
        <>
            <div className={tbStyle}>
                <div style={{textAlign:'right'}}>
                    <ActionBtn msg={trans.__('Add new database connection')} icon={connAddIcon} onClick={onAddConn}/>
                    <ActionBtn msg={trans.__('refresh')} icon={refreshIcon} onClick={onRefresh} />
                </div>
                <hr/>
            </div>
            <ul className={listStyle}>
            { list.map(p=>
                <li onClick={onSelect(p)} title={p.name+'\n'+p.desc} >
                    <connIcon.react tag="span" width="16px" height="16px"/>
                    <span className='name'>{p.name}</span>
                    <span className='memo'>{p.desc}</span></li>)}
            </ul>
        </>
    )
}

export const DBList : React.FC<ListProps> = ({trans, onSelect, list, onRefresh}): React.ReactElement => {
    return (
        <>
            <div className={tbStyle}>
                <div style={{textAlign:'right'}}>
                    <ActionBtn msg={trans.__('refresh')} icon={refreshIcon} onClick={onRefresh} />
                </div>
                <hr/>
            </div>
            <ul className={listStyle}>
            { list.map(p=>
                <li onClick={onSelect(p)} title={p.name+'\n'+p.desc}>
                    { p.type=='db' && <sqlIcon.react tag="span" width="16px" height="16px"/> }
                    { p.type=='table' && <tabIcon.react tag="span" width="16px" height="16px"/> }
                    <span className='name'>{p.name}</span>
                    <span className='memo'>{p.desc}</span></li>)}
            </ul>
        </>
    )
}

export const TbList : React.FC<ListProps> = ({trans, onSelect, list, onRefresh, filter}): React.ReactElement => {
    return (
        <>
            <div className={tbStyle}>
                <div style={{textAlign:'right'}}>
                    <ActionBtn msg={trans.__('refresh')} icon={refreshIcon} onClick={onRefresh} />
                </div>
                <hr/>
            </div>
            <ul className={listStyle} >
            { list.filter(p=>p.name.includes(filter) || (p.desc && p.desc.includes(filter))).map(p=>
                <li onClick={onSelect(p)} title={p.name+'\n'+p.desc}>
                    <tabIcon.react tag="span" width="14px" height="14px" right="5px"/>
                    <span className='name'>{p.name}</span>
                    <span className='memo'>{p.desc}</span></li>)}
            </ul>
        </>
    )
}
