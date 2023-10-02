import * as React from 'react';
import { Menu } from '@lumino/widgets';
import { CommandRegistry } from '@lumino/commands';
import { Clipboard, InputDialog } from '@jupyterlab/apputils';
import { refreshIcon, copyIcon, editIcon } from '@jupyterlab/ui-components';
//import { newQuery } from '../QueryWidget'
import { newSqlConsole } from '../sqlConsole';
import { style } from 'typestyle';
import { IDbItem, CommentType, IComment } from '../interfaces';
import { queryIcon } from '../icons';
import { tbStyle, listStyle, hrStyle, activeStyle } from './styles';
import { ActionBtn } from './ActionBtn';
import { IJpServices } from '../JpServices';
import { QueryModel, getSqlModel } from '../model';
import { Loading } from './loading';

const chkStyle = style({
  padding: '2px 5px 2px 0px',
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '2px',
  $nest: {
    '&:hover': {
      backgroundColor: '#ddd'
    },
    '&:active': {
      backgroundColor: '#bbb'
    }
  }
});

type TColProps = {
  jp_services: IJpServices;
  list: Array<IDbItem>;
  filter: string;
  dbid: string;
  schema: string;
  table: string;
  onRefresh: () => any;
  wait?: boolean;
};

type TColState = {
  checked: Set<string>;
  sel_name?: string;
};

/**
 * React component for rendering a panel for performing Table operations.
 */
export class ColList extends React.Component<TColProps, TColState> {
  constructor(props: TColProps) {
    super(props);
    this._contextMenu = this._createContextMenu();
    this.state = {
      checked: new Set()
    };
  }

  private _createContextMenu(): Menu {
    const commands = new CommandRegistry();
    const copy = 'copyName';
    const copy_all = 'copyAll';
    const edit = 'edit';
    const { trans } = this.props.jp_services;

    commands.addCommand(copy, {
      label: trans.__('Copy Column Name'),
      icon: copyIcon.bindprops({ stylesheet: 'menuItem' }),
      execute: this._copyToClipboard('n')
    });
    commands.addCommand(copy_all, {
      label: trans.__('Copy Column Name & Comment'),
      icon: copyIcon.bindprops({ stylesheet: 'menuItem' }),
      execute: this._copyToClipboard('all')
    });
    commands.addCommand(edit, {
      label: trans.__('Edit Comment'),
      icon: editIcon.bindprops({ stylesheet: 'menuItem' }),
      execute: this._editComment
    });
    const menu = new Menu({ commands });
    menu.addItem({ command: edit });
    menu.addItem({ command: copy });
    menu.addItem({ command: copy_all });
    return menu;
  }

  render(): React.ReactElement {
    const { jp_services, list, filter, wait, onRefresh } = this.props;
    const { trans } = jp_services;
    const { checked, sel_name } = this.state;
    const all = new Set<string>(list.map(p => p.name));
    return (
      <>
        <div className={tbStyle}>
          <div onClick={this._select_all} className={chkStyle}>
            <input
              type="checkbox"
              checked={checked.size === all.size && all.size !== 0}
              disabled={filter !== ''}
            />
            <span>
              {checked.size === all.size
                ? trans.__('Select None')
                : trans.__('Select All')}
            </span>
          </div>
          <div style={{ float: 'right' }}>
            <ActionBtn
              msg={trans.__('open sql console')}
              icon={queryIcon}
              onClick={this._sql_query}
            />
            <ActionBtn
              msg={trans.__('refresh')}
              icon={refreshIcon}
              onClick={onRefresh}
            />
          </div>
          <div style={{ clear: 'both' }} />
          <hr className={hrStyle} />
        </div>
        {wait ? (
          <Loading />
        ) : (
          <ul className={listStyle}>
            {list
              .filter(
                p =>
                  p.name.toLowerCase().includes(filter) ||
                  (p.desc && p.desc.toLowerCase().includes(filter))
              )
              .map(p => (
                <li
                  className={sel_name === p.name ? activeStyle : ''}
                  onClick={this._onSelect(p)}
                  title={p.name + '\n' + p.desc}
                  onContextMenu={event => this._handleContextMenu(event, p)}
                >
                  <input type="checkbox" checked={checked.has(p.name)} />
                  <span className="name">{p.name}</span>
                  <span className="memo">{p.desc}</span>
                </li>
              ))}
          </ul>
        )}
      </>
    );
  }
  //jp-DirListing-item jp-mod-selected"
  private _handleContextMenu = (
    event: React.MouseEvent<any>,
    item: IDbItem
  ) => {
    event.preventDefault();
    this._sel_item = item;
    this.setState({ sel_name: item.name });
    this._contextMenu.open(event.clientX, event.clientY);
  };

  private _copyToClipboard = (t: string) => () => {
    const { name, desc } = this._sel_item;
    const comment = desc?.trim();
    if (t === 'all' && comment !== '') {
      Clipboard.copyToSystem(`${name} /* ${comment} */`);
    } else {
      Clipboard.copyToSystem(name);
    }
  };

  private _select_all = async (ev: any) => {
    let { checked } = this.state;
    const { list, filter } = this.props;
    if (filter !== '') {
      return;
    }
    if (checked.size === list.length) {
      checked.clear();
    } else {
      checked = new Set<string>(list.map(p => p.name));
    }
    this.setState({ checked, sel_name: '' });
  };

  private _editComment = async () => {
    const { dbid, schema, table } = this.props;
    const { name, desc } = this._sel_item;
    const { trans } = this.props.jp_services;
    const result = await InputDialog.getText({
      title: trans.__('Input Comment of: ' + name),
      text: desc
    });
    if (result.value === null || result.value === desc) {
      return;
    }
    const comment: IComment = {
      type: CommentType.C_COLUMN,
      dbid,
      schema,
      table,
      column: name,
      comment: result.value || ''
    };
    getSqlModel().add_comment(comment);
  };

  private _onSelect =
    (item: IDbItem) =>
    async (ev: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
      const { checked } = this.state;
      const { name } = item;
      if (checked.has(name)) {
        checked.delete(name);
      } else {
        checked.add(name);
      }
      this.setState({ checked, sel_name: '' });
    };

  private _sql_query = (ev: any) => {
    const { checked } = this.state;
    const { dbid, schema, table, list } = this.props;

    const col_names: { [key: string]: string } = list.reduce(
      (acc, { name, desc }) => ({ ...acc, [name]: desc }),
      {}
    );

    let sql = 'SELECT ';
    if (checked.size === 0) {
      sql += '*';
    } else {
      const cols = new Array<string>();
      checked.forEach(c => {
        const comment = col_names[c].trim();
        if (comment) {
          cols.push(`    t.\`${c}\` /* ${comment} */`);
        } else {
          cols.push(`    t.\`${c}\``);
        }
      });
      sql += '\n' + cols.join(',\n');
    }
    sql +=
      '\nFROM ' + (schema !== '' ? schema + '.' : '') + table + ' t LIMIT 200';
    const qmodel = new QueryModel({ dbid, conn_readonly: true });
    newSqlConsole(qmodel, sql, this.props.jp_services);
  };

  private readonly _contextMenu: Menu;
  private _sel_item!: IDbItem;
}
