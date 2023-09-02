import { IJpServices } from '../JpServices';
import * as React from 'react';
import { style } from 'typestyle';
import { SqlModel} from '../model';
import { IDbItem } from '../interfaces'
//import { sqlIcon, connIcon, tabIcon, rootIcon, colIcon } from '../icons';
import { rootIcon} from '../icons';
import { searchIcon } from '@jupyterlab/ui-components'
import { ConnList, DBList, TbList} from './dblist'
import { ColList} from './collist'
import { newConnDialog } from './new_conn'

const panelMain = style({
    padding: 10,
    paddingBottom: 0
})

const navStyle = style({
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    marginTop: 10,
    $nest: {
        '&>li': {
            display: 'inline-block',
            $nest: {
                '&:first-child>span': {
                 verticalAlign: 'text-top'
                },
                '&>span': {
                    borderRadius: 2,
                    margin: '0 1px',
                    padding: '0 1px',
                    maxWidth: 50,
                    display: 'inline-block',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    height: '1.2em',
                    lineHeight: '1.2em',
                    verticalAlign: 'middle',
                    $nest: {
                        '&:hover':{
                         backgroundColor: '#ccc'
                        }
                    }
                }
            }
        }
    }
});

const inputIconStyle = style({
    height: 16, 
    width: 16,
    float: 'right',
    position: 'relative',
    top: -22,
    right: 5,
})

/**
 * Interface describing component properties.
 */
export interface ISqlPanelProps {
    model : SqlModel,
    jp_services : IJpServices
}

/**
 * Interface describing component state.
 */
export interface ISqlPanelState {
    filter: string,
    path : Array<IDbItem>,
    list_type : string
}

/**
 * React component for rendering a panel for performing Sql operations.
 */
export class SqlPanel extends React.Component<ISqlPanelProps, ISqlPanelState> {
  /**
   * Returns a React component for rendering a panel show sql tree.
   *
   * @param props - component properties
   * @returns React component
   */
  constructor(props: ISqlPanelProps) {
    super(props);
    this.state = {
      filter: '',
      path : [],
      list_type : 'root'
    };
  }

  /**
   * Callback invoked immediately after mounting a component (i.e., inserting into a tree).
   */
  async componentDidMount(): Promise<void> {
      let {path}=this.state
      const rc= await this.props.model.load_path(path)
      if (!rc) return
      this.setState({path})
  }

  componentWillUnmount(): void {
    // Clear all signal connections
    // Signal.clearData(this);
  }
  
  /**
   * Renders the component.
   *
   * @returns React element
   */
  render(): React.ReactElement {
    const {filter, path, list_type}=this.state
    const {model, jp_services}=this.props
    const {trans}=jp_services
    return (
      <>
        <div className={panelMain}>
            <div className='jp-InputGroup bp3-input-group'>
                <input className='bp3-input' placeholder={trans.__('filter by name')} value={filter} 
                    onChange={this._setFilter}/>
                <searchIcon.react tag="span" className={inputIconStyle}/>
            </div>
            <ul className={navStyle}>
                <li onClick={this._go('root')}>
                    <rootIcon.react tag="span" width="16px" height="16px" top="2px"/>
                </li>
                { path.map(p=>
                    <li onClick={this._go(p)}>&gt;<span title={p.name}>{p.name}</span></li> )}
            </ul>
            <hr/>
        </div>
        { list_type=='root' && 
            <ConnList onSelect={this._select} trans={trans} list={model.get_list(path)} filter={filter} 
                onAddConn={this._add} onRefresh={this._refresh}/> }
        { list_type=='conn' && 
            <DBList onSelect={this._select} trans={trans} list={model.get_list(path)} filter={filter}
                onRefresh={this._refresh}/> }
        { list_type=='db' && 
            <TbList onSelect={this._select} trans={trans} list={model.get_list(path)} filter={filter}
                onRefresh={this._refresh}/> }
        { list_type=='table' && 
            <ColList list={model.get_list(path)} jp_services={jp_services} filter={filter}
                    dbid={path[0].name} table={`${path[path.length-2].name}.${path[path.length-1].name}`} /> }            
      </>
    );
  }
    
  private _go=(p: IDbItem|string)=>(ev: React.MouseEvent<HTMLLIElement, MouseEvent>)=>{
      let list_type:string='root';
      if (p=='root') {
          this.setState({path:[], list_type})
      }else{
          let {path}=this.state
          var np:Array<IDbItem>=[]
          for ( const cp of path) {
              np.push(cp)
              if (cp==p) {
                  list_type=cp.type
                  break;
              }
          }
          this.setState({path:np, list_type})
      }
  }
    
  private _select=(item: IDbItem)=>async (ev: React.MouseEvent<HTMLLIElement, MouseEvent>)=>{
      let {path}=this.state
      path.push(item)
      const rc = await this.props.model.load_path(path)
      if (!rc) return
      this.setState({path, list_type:item.type, filter:''})
  }
    
  private _add=async ()=>{
      newConnDialog(this.props.jp_services.trans)
  } 
    
  private _refresh=async()=>{
      let {path}=this.state
      let {model}=this.props
      model.refresh(path)
      await model.load_path(path)
      this.forceUpdate()
  }   
    
  private _setFilter=(ev: React.ChangeEvent<HTMLInputElement>)=>{
      const filter=ev.target.value
      this.setState({filter})
  } 
}

