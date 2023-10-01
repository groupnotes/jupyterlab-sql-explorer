import { IDisposable } from '@lumino/disposable';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { copyIcon } from '@jupyterlab/ui-components';
import { Menu } from '@lumino/widgets';

import {
  DataModel,
  DataGrid,
  TextRenderer,
  //CellRenderer,
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel
} from '@lumino/datagrid';

namespace CommandIds {
  export const copyToClipboard = 'copy-selection-to-clipboard';
}

namespace Table {
  export interface IOptions {
    translator?: ITranslator;
  }
}

export class Table implements IDisposable {
  constructor(model: TableDataModel, options?: Table.IOptions) {
    const translator = options?.translator || nullTranslator;
    const trans = translator?.load('jupyterlab_sql_explorer');

    this._grid = new DataGrid({
      defaultSizes: {
        rowHeight: 24,
        columnWidth: 144,
        rowHeaderWidth: 64,
        columnHeaderHeight: 36
      }
    });

    this.theme = 'light';

    this._grid.dataModel = model;
    this._grid.keyHandler = new BasicKeyHandler();
    this._grid.mouseHandler = new BasicMouseHandler();
    this._grid.selectionModel = new BasicSelectionModel({ dataModel: model });
    this._grid.node.addEventListener('contextmenu', this._onContextMenu);
    this._contextMenu = this._createContextMenu(trans);
  }

  private _createContextMenu(trans: TranslationBundle): Menu {
    const commands = new CommandRegistry();
    commands.addCommand(CommandIds.copyToClipboard, {
      label: trans.__('Copy Selection'),
      icon: copyIcon.bindprops({ stylesheet: 'menuItem' }),
      execute: () => this._copySelectionToClipboard()
    });
    const menu = new Menu({ commands });
    menu.addItem({ command: CommandIds.copyToClipboard });
    return menu;
  }

  private _copySelectionToClipboard(): void {
    this._grid.copyToClipboard();
  }

  private _onContextMenu = (event: MouseEvent) => {
    const { clientX, clientY } = event;
    this._contextMenu.open(clientX, clientY);
    event.preventDefault();
  };

  set theme(th: string) {
    let renderer: TextRenderer;
    if (th === 'dark') {
      this._grid.style = Private.DARK_STYLE;
      renderer = new TextRenderer({ textColor: '#F3F3F3' });
    } else {
      this._grid.style = Private.LIGHT_STYLE;
      renderer = new TextRenderer({ textColor: '#131313' });
    }
    this._updateRenderer(renderer);
  }

  private _updateRenderer(renderer: TextRenderer): void {
    this._grid.cellRenderers.update({
      body: renderer,
      'column-header': renderer,
      'corner-header': renderer,
      'row-header': renderer
    });
  }

  set dataModel(model: TableDataModel) {
    this._grid.dataModel = model;
    this._grid.selectionModel = new BasicSelectionModel({ dataModel: model });
  }

  get widget(): DataGrid {
    return this._grid;
  }

  get selection(): Array<any> {
    //toArray(this._selectionModel.selections());
    return [];
  }

  get isDisposed(): boolean {
    return this._grid.isDisposed;
  }

  dispose(): void {
    this._grid.node.removeEventListener('contextmenu', this._onContextMenu);
    this._grid.dispose();
  }

  private readonly _grid: DataGrid;
  private readonly _contextMenu: Menu;
}

export class TableDataModel extends DataModel {
  constructor(keys: Array<string>, data: Array<Array<any>>) {
    super();
    this._data = data;
    this._keys = keys;
  }

  readonly _data: Array<Array<any>>;
  readonly _keys: Array<string>;

  rowCount(region: DataModel.RowRegion): number {
    return region === 'body' ? this._data.length : 1;
  }

  columnCount(region: DataModel.ColumnRegion): number {
    return region === 'body' ? this._keys.length : 1;
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    if (region === 'row-header') {
      return row;
    }
    if (region === 'column-header') {
      return this._keys[column];
    }
    if (region === 'corner-header') {
      return '';
    }
    return this._serializeData(this._data[row][column]);
  }

  _serializeData(data: any): any {
    const _type = typeof data;
    if (_type === 'object') {
      return JSON.stringify(data);
    }
    return data;
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The light theme for the data grid.
   */
  export const LIGHT_STYLE: DataGrid.Style = {
    ...DataGrid.defaultStyle,
    voidColor: '#F3F3F3',
    backgroundColor: 'white',
    headerBackgroundColor: '#EEEEEE',
    gridLineColor: 'rgba(20, 20, 20, 0.15)',
    headerGridLineColor: 'rgba(20, 20, 20, 0.25)',
    rowBackgroundColor: i => (i % 2 === 0 ? '#F5F5F5' : 'white')
  };

  /**
   * The dark theme for the data grid.
   */
  export const DARK_STYLE: DataGrid.Style = {
    ...DataGrid.defaultStyle,
    voidColor: 'black',
    backgroundColor: '#111111',
    headerBackgroundColor: '#424242',
    gridLineColor: 'rgba(235, 235, 235, 0.15)',
    headerGridLineColor: 'rgba(235, 235, 235, 0.25)',
    rowBackgroundColor: i => (i % 2 === 0 ? '#212121' : '#111111')
  };
}
