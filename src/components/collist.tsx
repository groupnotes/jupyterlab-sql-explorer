import * as React from 'react';
//import { refreshIcon } from '@jupyterlab/ui-components'
import { newQuery } from '../QueryWidget'
import { style } from 'typestyle';
import { IDbItem } from '../interfaces'
import { queryIcon } from '../icons';
import { tbStyle, listStyle } from './styles';
import { ActionBtn } from './ActionBtn'
import { IJpServices } from '../JpServices';

const SelStyle = style({
    paddingLeft: 0,
    display: 'inline-block'
})

// type SelectFunc=(item : IDbItem)=>(ev: React.MouseEvent<HTMLLIElement, MouseEvent>)=>Promise<void>
type TColProps={
    jp_services : IJpServices,
    list : Array<IDbItem>,
    filter: string,
    dbid : string,
    table : string
}

type TColState={
    checked: Set<string>
}

/**
 * React component for rendering a panel for performing Table operations.
 */
export class ColList extends React.Component<TColProps, TColState> {
    
    state:TColState={
        checked: new Set()
    }
        
    render(): React.ReactElement {
        const {jp_services, list, filter}=this.props
        const {trans}=jp_services
        const {checked}=this.state
        const all = new Set<string>(list.map(p=>p.name))
        return (
        <>
            <div className={tbStyle}>
                <div>
                    <span onClick={this._select_all} className={SelStyle} >
                        <input type='checkbox' checked={checked.size==all.size} />
                        {checked.size==all.size?trans.__("Select None"):trans.__("Select All")}
                    </span>
                    <ActionBtn msg={trans.__('open sql console')} icon={queryIcon} 
                        onClick={this._sql_query} style={{float:'right'}}/>
                </div>
                <hr/>
            </div>
            <ul className={listStyle}>
            { list.filter(p=>p.name.includes(filter) || (p.desc && p.desc.includes(filter))).map(p=>
                <li onClick={this._onSelect(p)} title={p.name+'\n'+p.desc}>
                    <input type='checkbox' checked={checked.has(p.name)} />
                    <span className='name'>{p.name}</span>
                    <span className='memo'>{p.desc}</span></li>)}
                           
            </ul>
        </>)
    }
    
    private _select_all=async (ev: any)=>{
        let {checked}=this.state
        const {list}=this.props
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
        const {table}=this.props
        let sql:string='SELECT '
        if (checked.size==0) {
            sql +="*"
        }else{
            let cols=new Array<string>()
            checked.forEach(c=>cols.push(`t.${c}`))
            sql += cols.join(',') 
        }
        sql += "\nFROM " + table + " t"
        newQuery(sql, this.props.jp_services)
    }
}