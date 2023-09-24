import * as React from 'react';
import { Menu } from '@lumino/widgets';
import { Clipboard } from '@jupyterlab/apputils';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';
import { TranslationBundle } from '@jupyterlab/translation';
import { refreshIcon, deleteIcon, clearIcon } from '@jupyterlab/ui-components';
import { FixedSizeList as List } from 'react-window';
import { Loading } from './loading';
import AutoSizer from '../auto_resizer';

import { IDbItem, ConnType } from '../interfaces';
import { IJpServices } from '../JpServices';
import {
  queryIcon,
  oracleIcon,
  sqlIcon,
  tabIcon,
  connAddIcon,
  hiveIcon,
  pgsqlIcon,
  mysqlIcon,
  sqliteIcon
} from '../icons';
import {
  tbStyle,
  listStyle,
  hrStyle,
  divListStyle,
  activeStyle
} from './styles';
import { ActionBtn } from './ActionBtn';
import { getSqlModel, QueryModel } from '../model';
import { newSqlConsole } from '../sqlConsole';

type SelectFunc = (
  item: IDbItem
) => (
  ev: React.MouseEvent<HTMLLIElement | HTMLDivElement, MouseEvent>
) => Promise<void>;

type ListProps = {
  onSelect: SelectFunc;
  list: Array<IDbItem>;
  onRefresh: () => any;
  filter: string;
  wait?: boolean;
  jp_services?: IJpServices;
  trans: TranslationBundle;
};

type ConnListProps = ListProps & { onAddConn: () => any };

/**
 * React component for rendering a panel for performing Table operations.
 */
export class ConnList extends React.Component<
  ConnListProps,
  { sel_name?: string }
> {
  constructor(props: ConnListProps) {
    super(props);
    this._contextMenu = this._createContextMenu();
    this.state = {};
  }

  private _createContextMenu(): Menu {
    const { trans } = this.props.jp_services as IJpServices;
    const commands = new CommandRegistry();
    const del = 'del';
    const clear_pass = 'clean-pass';
    const open_console = 'open-console';

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
    menu.addItem({ command: del });
    menu.addItem({ command: clear_pass });
    menu.addItem({ command: open_console });
    return menu;
  }

  render(): React.ReactElement {
    const { onSelect, list, onAddConn, onRefresh, filter, jp_services } =
      this.props;
    const { trans } = jp_services as IJpServices;
    const { sel_name } = this.state;
    console.log(list);
    return (
      <>
        <div className={tbStyle}>
          <div style={{ textAlign: 'right' }}>
            <ActionBtn
              msg={trans.__('Add new database connection')}
              icon={connAddIcon}
              onClick={onAddConn}
            />
            <ActionBtn
              msg={trans.__('refresh')}
              icon={refreshIcon}
              onClick={onRefresh}
            />
          </div>
          <hr className={hrStyle} />
        </div>
        <ul className={listStyle}>
          {list
            .filter(
              p =>
                p.name.toLowerCase().includes(filter) ||
                (p.desc && p.desc.toLowerCase().includes(filter))
            )
            .map((p, idx) => (
              <li
                key={idx}
                className={sel_name === p.name ? activeStyle : ''}
                onClick={onSelect(p)}
                title={p.name + '\n' + p.desc}
                onContextMenu={event => this._handleContextMenu(event, p)}
              >
                {(p.subtype as ConnType) === ConnType.DB_MYSQL && (
                  <mysqlIcon.react tag="span" width="16px" height="16px" />
                )}
                {(p.subtype as ConnType) === ConnType.DB_PGSQL && (
                  <pgsqlIcon.react tag="span" width="16px" height="16px" />
                )}
                {((p.subtype as ConnType) === ConnType.DB_HIVE_LDAP ||
                  (p.subtype as ConnType) === ConnType.DB_HIVE_KERBEROS) && (
                  <hiveIcon.react tag="span" width="16px" height="16px" />
                )}
                {(p.subtype as ConnType) === ConnType.DB_SQLITE && (
                  <sqliteIcon.react tag="span" width="16px" height="16px" />
                )}
                {(p.subtype as ConnType) === ConnType.DB_ORACLE && (
                  <oracleIcon.react tag="span" width="16px" height="16px" />
                )}
                <span className="name">{p.name}</span>
                <span className="memo">{p.desc}</span>
              </li>
            ))}
        </ul>
      </>
    );
  }

  private _handleContextMenu = (
    event: React.MouseEvent<any>,
    item: IDbItem
  ) => {
    this._sel_item = item;
    this._contextMenu.open(event.clientX, event.clientY);
    event.preventDefault();
    this.setState({ sel_name: item.name });
  };

  private _del_conn = async () => {
    const { trans } = this.props.jp_services as IJpServices;
    const { name } = this._sel_item;
    showDialog({
      title: trans.__('Are You Sure?'),
      body: trans.__('Delete Database Connection：') + name,
      buttons: [Dialog.cancelButton(), Dialog.okButton()]
    }).then(result => {
      if (result.button.accept) {
        getSqlModel().del_conn(name);
      }
    });
  };

  private _clear_pass = () => {
    getSqlModel().clear_pass(this._sel_item.name);
  };

  private _open_console = () => {
    const qmodel = new QueryModel({
      dbid: this._sel_item.name,
      conn_readonly: true
    });
    newSqlConsole(qmodel, '', this.props.jp_services as IJpServices);
  };

  private readonly _contextMenu: Menu;
  private _sel_item!: IDbItem;
}

export const DBList: React.FC<ListProps> = ({
  trans,
  onSelect,
  list,
  onRefresh,
  filter,
  wait
}): React.ReactElement => {
  const l = list.filter(
    p =>
      p.name.toLowerCase().includes(filter) ||
      (p.desc && p.desc.toLowerCase().includes(filter))
  );
  const Row = ({
    index,
    style,
    data
  }: {
    index: number;
    style: React.CSSProperties;
    data: any;
  }) => {
    const p = data[index];
    return (
      <div
        key={index}
        style={style}
        onClick={onSelect(p)}
        title={p.name + '\n' + p.desc}
        className={divListStyle}
      >
        {p.type === 'db' && (
          <sqlIcon.react
            tag="span"
            width="16px"
            height="16px"
            verticalAlign="text-top"
          />
        )}
        {p.type === 'table' && (
          <tabIcon.react
            tag="span"
            width="16px"
            height="16px"
            verticalAlign="text-top"
          />
        )}
        <span className="name">{p.name}</span>
        <span className="memo">{p.desc}</span>
      </div>
    );
  };
  return (
    <>
      <div className={tbStyle}>
        <div style={{ textAlign: 'right' }}>
          <ActionBtn
            msg={trans.__('refresh')}
            icon={refreshIcon}
            onClick={onRefresh}
          />
        </div>
        <hr className={hrStyle} />
      </div>
      {wait ? (
        <Loading />
      ) : (
        <AutoSizer>
          {({ height, width }: { height: any; width: any }) => (
            <List
              itemCount={l.length}
              itemData={l}
              itemSize={25}
              height={height - 120}
              width={width}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      )}
    </>
  );
};

export class TbList extends React.Component<ListProps, { sel_name?: string }> {
  constructor(props: ListProps) {
    super(props);
    this._contextMenu = this._createContextMenu();
    this.state = {
      sel_name: ''
    };
  }

  private _createContextMenu(): Menu {
    const { trans } = this.props;
    const commands = new CommandRegistry();
    const copy = 'copyName';
    const copy_all = 'copyAll';
    commands.addCommand(copy, {
      label: trans.__('Copy Table Name'),
      iconClass: 'jp-MaterialIcon jp-CopyIcon',
      execute: this._copyToClipboard('n')
    });
    commands.addCommand(copy_all, {
      label: trans.__('Copy Table Name & Comment'),
      iconClass: 'jp-MaterialIcon jp-CopyIcon',
      execute: this._copyToClipboard('all')
    });
    const menu = new Menu({ commands });
    menu.addItem({ command: copy });
    menu.addItem({ command: copy_all });
    return menu;
  }

  render(): React.ReactElement {
    const { trans, onSelect, list, onRefresh, filter, wait } = this.props;

    const { sel_name } = this.state;

    const l = list.filter(
      p =>
        p.name.toLowerCase().includes(filter) ||
        (p.desc && p.desc.toLowerCase().includes(filter))
    );

    const Row = ({
      index,
      style,
      data
    }: {
      index: number;
      style: React.CSSProperties;
      data: any;
    }) => {
      const p = data[index];
      return (
        <div
          key={index}
          style={style}
          onClick={onSelect(p)}
          title={p.name + '\n' + p.desc}
          className={
            divListStyle + ' ' + (sel_name === p.name ? activeStyle : '')
          }
          onContextMenu={event => this._handleContextMenu(event, p)}
        >
          <tabIcon.react
            tag="span"
            width="14px"
            height="14px"
            right="5px"
            verticalAlign="text-top"
          />
          <span className="name">{p.name}</span>
          <span className="memo">{p.desc}</span>
        </div>
      );
    };

    return (
      <>
        <div className={tbStyle}>
          <div style={{ textAlign: 'right' }}>
            <ActionBtn
              msg={trans.__('refresh')}
              icon={refreshIcon}
              onClick={onRefresh}
            />
          </div>
          <hr className={hrStyle} />
        </div>
        {wait ? (
          <Loading />
        ) : (
          <AutoSizer>
            {({ height, width }: { height: any; width: any }) => (
              <List
                itemCount={l.length}
                itemData={l}
                itemSize={25}
                height={height - 120}
                width={width}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </>
    );
  }

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

  private readonly _contextMenu: Menu;
  private _sel_item!: IDbItem;
}
