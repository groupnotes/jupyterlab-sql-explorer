import { Clipboard } from '@jupyterlab/apputils';

import { Menu, Widget } from '@lumino/widgets';

import { IDisposable } from '@lumino/disposable';

import { CommandRegistry } from '@lumino/commands';

import { Table, TableDataModel} from './Table';

namespace CommandIds {
  export const copyToClipboard = 'copy-selection-to-clipboard';
}

export class ResultsTable implements IDisposable {
  constructor(keys: Array<string>, data: Array<Array<any>>, options?: Table.IOptions) {
    const contextMenu = this._createContextMenu();
    this._model = new TableDataModel(keys, data);
    this._table = new Table(this._model, { ...options, contextMenu })
  }

  get widget(): Widget {
    return this._table.widget;
  }
    
  setData(keys: Array<string>, data: Array<Array<any>>) {
    //if (!this._model.isDisposed) this._model.dispose()
    this._model = new TableDataModel(keys, data);
    this._table.dataModel = this._model;
  }

  dispose(): void {
    this._table.dispose();
    this._isDisposed = true;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  private _createContextMenu(): Menu {
    const commands = new CommandRegistry();
    commands.addCommand(CommandIds.copyToClipboard, {
      label: 'Copy cell',
      iconClass: 'jp-MaterialIcon jp-CopyIcon',
      execute: () => this._copySelectionToClipboard()
    });
    const menu = new Menu({ commands });
    menu.addItem({ command: CommandIds.copyToClipboard });
    return menu;
  }

  private _copySelectionToClipboard(): void {
    const selectionValue = this._table.selectionValue;
    if (selectionValue !== null) {
      Clipboard.copyToSystem(String(selectionValue));
    }
  }

  private _isDisposed = false;
  private readonly _table: Table;
  private _model: TableDataModel;
}
