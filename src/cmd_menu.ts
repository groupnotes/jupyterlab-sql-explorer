import { JupyterFrontEnd } from '@jupyterlab/application';
import { CommandRegistry } from '@lumino/commands';
//import { ContextMenu, DockPanel, Menu, Panel, Widget } from '@lumino/widgets';
import { Menu } from '@lumino/widgets';
import { TranslationBundle } from '@jupyterlab/translation';
import { IDBConn } from './interfaces';
import { SqlModel } from './model';
import { createNewConn } from './components/new_conn';

// add command add menu
export enum CommandIDs {
  sqlConsole = 'sql:console',
  sqlNewConn = 'sql:newconn',
  sqlClearPass = 'sql:clearpass'
}

/**
 * Adds commands
 *
 * @param app  - Jupyter App
 * @param model - SqlModel
 * @param trans - language translator
 * @returns menu
 */
export function addCommands(
  app: JupyterFrontEnd,
  model: SqlModel,
  trans: TranslationBundle
): void {
  const { commands } = app;

  // add create new connection command
  commands.addCommand(CommandIDs.sqlNewConn, {
    label: trans.__('New Connection'),
    caption: trans.__('Create New Database Connection'),
    execute: async (data?: Partial<IDBConn>) => {
      createNewConn(data || {}, model, trans);
    }
  });

  // add create new connection command
  commands.addCommand(CommandIDs.sqlClearPass, {
    label: trans.__('Clear Passwd'),
    caption: trans.__('Clear temporary stored password'),
    execute: async () => {
      model.clear_pass();
    }
  });
}

/**
 * Adds commands and menu items.
 *
 * @param commands - Jupyter App commands registry
 * @param trans - language translator
 * @returns menu
 */
export function createMenu(
  commands: CommandRegistry,
  trans: TranslationBundle
): Menu {
  const menu = new Menu({ commands });
  menu.title.label = trans.__('Database');
  [CommandIDs.sqlNewConn, CommandIDs.sqlClearPass].forEach(command => {
    menu.addItem({ command });
  });

  return menu;
}
