import { Signal } from '@lumino/signaling';
import { searchIcon } from '@jupyterlab/ui-components';
import * as React from 'react';
import { style } from 'typestyle';
import { SqlModel } from '../model';
import { IDbItem } from '../interfaces';
import { IJpServices } from '../JpServices';
import { rootIcon } from '../icons';
import { ConnList, DBList, TbList } from './dblist';
import { ColList } from './collist';
//import { newConnDialog } from './new_conn'
import { hrStyle } from './styles';
import { CommandIDs } from '../cmd_menu';

const panelMain = style({
  padding: 10,
  paddingBottom: 0
});

const navStyle = style({
  listStyleType: 'none',
  margin: 0,
  padding: 0,
  marginTop: 10,
  marginBottom: 5,
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
            '&:hover': {
              backgroundColor: 'var(--jp-layout-color2)'
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
  right: 5
});

/**
 * Interface describing component properties.
 */
export interface ISqlPanelProps {
  model: SqlModel;
  jp_services: IJpServices;
}

/**
 * Interface describing component state.
 */
export interface ISqlPanelState {
  filter: string;
  path: Array<IDbItem>;
  list_type: string;
  wait: boolean;
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
      path: [],
      list_type: 'root',
      wait: false
    };
  }

  /**
   * Callback invoked immediately after mounting a component (i.e., inserting into a tree).
   */
  async componentDidMount(): Promise<void> {
    this.props.model.passwd_settled.connect((_, db_id) => {
      this._refresh();
    }, this);

    this.props.model.conn_changed.connect(() => {
      this.forceUpdate();
    }, this);

    const { path } = this.state;
    const rc = await this.props.model.load_path(path);
    if (!rc) {
      return;
    }
    this.setState({ path });
  }

  componentWillUnmount(): void {
    //Clear all signal connections
    Signal.clearData(this);
  }

  /**
   * Renders the component.
   *
   * @returns React element
   */
  render(): React.ReactElement {
    const { filter, path, list_type, wait } = this.state;
    const { model, jp_services } = this.props;
    const { trans } = jp_services;
    const filter_l = filter.toLowerCase();
    return (
      <>
        <div className={panelMain}>
          <div className="jp-InputGroup bp3-input-group">
            <input
              className="bp3-input"
              placeholder={trans.__('filter by name')}
              value={filter}
              onChange={this._setFilter}
            />
            <searchIcon.react tag="span" className={inputIconStyle} />
          </div>
          <ul className={navStyle}>
            <li onClick={this._go(0, 'root')}>
              <rootIcon.react tag="span" width="16px" height="16px" top="2px" />
            </li>
            {path.map((p, idx) => (
              <li onClick={this._go(idx + 1, p.type)}>
                &gt;<span title={p.name}>{p.name}</span>
              </li>
            ))}
          </ul>
          <hr className={hrStyle} />
        </div>
        {list_type === 'root' && (
          <ConnList
            onSelect={this._select}
            trans={trans}
            jp_services={jp_services}
            list={model.get_list(path)}
            filter={filter_l}
            wait={wait}
            onAddConn={this._add}
            onRefresh={this._refresh}
          />
        )}
        {list_type === 'conn' && (
          <DBList
            onSelect={this._select}
            trans={trans}
            list={model.get_list(path)}
            filter={filter_l}
            wait={wait}
            onRefresh={this._refresh}
          />
        )}
        {list_type === 'db' && (
          <TbList
            onSelect={this._select}
            trans={trans}
            list={model.get_list(path)}
            filter={filter_l}
            wait={wait}
            onRefresh={this._refresh}
          />
        )}
        {list_type === 'table' && (
          <ColList
            list={model.get_list(path)}
            jp_services={jp_services}
            filter={filter_l}
            onRefresh={this._refresh}
            wait={wait}
            dbid={path[0].name}
            schema={path.length < 3 ? '' : path[path.length - 2].name}
            table={path[path.length - 1].name}
          />
        )}
      </>
    );
  }

  private _go =
    (idx: number, list_type: string) =>
    (ev: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
      const { path } = this.state;
      this.setState({ path: path.slice(0, idx), list_type, filter: '' });
    };

  private _select =
    (item: IDbItem) =>
    async (
      ev: React.MouseEvent<HTMLLIElement | HTMLDivElement, MouseEvent>
    ) => {
      const { path } = this.state;
      const p = [...path, item];
      this.setState({ path: p, list_type: item.type, filter: '', wait: true });
      const rc = await this.props.model.load_path(p);
      if (rc) {
        this.setState({ wait: false });
      }
    };

  private _add = async () => {
    const { trans } = this.props.jp_services;
    const commandRegistry = this.props.jp_services.app.commands;
    commandRegistry.execute(CommandIDs.sqlNewConn, {
      name: trans.__('unnamed')
    });
  };

  private _refresh = async () => {
    const { path } = this.state;
    const { model } = this.props;
    model.refresh(path);
    this.setState({ wait: true });
    const rc = await model.load_path(path);
    if (rc) {
      this.setState({ wait: false });
    }
  };

  private _setFilter = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const filter = ev.target.value;
    this.setState({ filter });
  };
}
