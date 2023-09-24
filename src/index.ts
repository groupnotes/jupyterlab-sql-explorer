import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { WidgetTracker, IThemeManager } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { IDocumentManager } from '@jupyterlab/docmanager';
//import { DocumentRegistry } from '@jupyterlab/docregistry';
//import { IStatusBar } from '@jupyterlab/statusbar';

import { SqlWidget } from './SqlWidget';
import { sqlIcon } from './icons';
import { getSqlModel } from './model';
import { IJpServices } from './JpServices';
import { askPasswd } from './components/ask_pass';
import { createNewConn } from './components/new_conn';
import { IPass, IDBConn } from './interfaces';

import { addCommands, createMenu } from './cmd_menu';
import {
  setup_sql_console,
  SqlConsoleWidget,
  SQL_CONSOLE_FACTORY,
  get_theme
} from './sqlConsole';

/**
 * Initialization data for the jupyterlab-sql-explorer extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-sql-explorer:plugin',
  autoStart: true,
  requires: [ILayoutRestorer, IEditorServices, IDocumentManager],
  optional: [IMainMenu, ISettingRegistry, IThemeManager, ITranslator],
  activate
};

function activate(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  editorService: IEditorServices,
  docManager: IDocumentManager,
  mainMenu: IMainMenu | null,
  settingRegistry: ISettingRegistry | null,
  themeManager: IThemeManager | null,
  translator: ITranslator | null
): void {
  translator = translator ?? nullTranslator;
  const trans = translator.load('jupyterlab_sql_explorer');

  const jp_services: IJpServices = {
    app,
    editorService,
    trans,
    docManager,
    themeManager
  };

  if (settingRegistry) {
    settingRegistry
      .load(plugin.id)
      .then(settings => {
        console.log(
          trans.__('jupyterlab-sql-explorer settings loaded:'),
          settings.composite
        );
      })
      .catch(reason => {
        console.error(
          trans.__('Failed to load settings for jupyterlab-sql-explorer.'),
          reason
        );
      });
  }

  const tracker = new WidgetTracker<IDocumentWidget<SqlConsoleWidget>>({
    namespace: 'jupyterlab_sql_explorer'
  });

  setup_sql_console(jp_services, tracker);

  // Create Sql Explorer model
  const model = getSqlModel();
  model.need_passwd.connect((_, pass_info: IPass) => {
    askPasswd(pass_info, model, trans);
  });

  model.create_conn.connect((_, data: IDBConn) => {
    createNewConn(data, model, trans);
  });

  addCommands(app, model, trans);

  // Add a menu for the plugin
  if (mainMenu && app.version.split('.').slice(0, 2).join('.') < '3.7') {
    // Support JLab 3.0
    mainMenu.addMenu(createMenu(app.commands, trans), { rank: 60 });
  }

  // Create the Sql widget sidebar
  const sqlPlugin = new SqlWidget(model, jp_services);
  sqlPlugin.id = 'jp-sql-sessions';
  sqlPlugin.title.icon = sqlIcon;
  sqlPlugin.title.caption = 'SQL explorer';

  // Let the application restorer track the running panel for restoration of
  // application state (e.g. setting the running panel as the current side bar
  // widget).
  if (restorer) {
    restorer.add(sqlPlugin, 'sql-explorer-sessions');
  }

  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  app.shell.add(sqlPlugin, 'left', { rank: 200 });

  if (restorer) {
    restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({
        path: widget.context.path,
        factory: SQL_CONSOLE_FACTORY
      }),
      name: widget => widget.context.path
    });
  }

  // Keep the themes up-to-date.
  const updateThemes = () => {
    const theme = get_theme(themeManager);
    tracker.forEach(sqlConsoleWdg => {
      sqlConsoleWdg.content.theme = theme;
    });
  };
  if (themeManager) {
    themeManager.themeChanged.connect(updateThemes);
  }
}

export default plugin;
