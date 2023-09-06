import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IMainMenu } from '@jupyterlab/mainmenu';
//import { IStatusBar } from '@jupyterlab/statusbar';

import { SqlWidget } from './SqlWidget';
import { sqlIcon } from './icons';
import { SqlModel } from './model';
import { IJpServices } from './JpServices';
import { askPasswd} from './components/ask_pass'
import { IPass} from './interfaces'

import { addCommands, createMenu } from './cmd_menu'

/**
 * Initialization data for the jupyterlab-sql-explorer extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-sql-explorer:plugin',
  autoStart: true,
  requires: [ILayoutRestorer, IEditorServices],
  optional: [IMainMenu, ISettingRegistry, ITranslator],
  activate
};

function activate(
    app: JupyterFrontEnd, 
    restorer: ILayoutRestorer,
    editorService: IEditorServices,
    mainMenu: IMainMenu | null,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
) {
    translator = translator ?? nullTranslator;
    const trans = translator.load('jupyterlab_sql_explorer');
        
    const jp_services: IJpServices = {
        app,
        editorService,
        trans
    }

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log(trans.__('jupyterlab-sql-explorer settings loaded:'), settings.composite);
        })
        .catch(reason => {
          console.error(trans.__('Failed to load settings for jupyterlab-sql-explorer.'), reason);
        });
    }
    
    // Create Sql Explorer model
    const model=new SqlModel()
    model.need_passwd.connect((_, pass_info:IPass)=>{
        askPasswd(pass_info, model, trans)
    })
        
    addCommands(app, model, trans)
        
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
    restorer.add(sqlPlugin, 'sql-explorer-sessions');

    // Rank has been chosen somewhat arbitrarily to give priority to the running
    // sessions widget in the sidebar.
    app.shell.add(sqlPlugin, 'left', { rank: 200 });
}

export default plugin;
