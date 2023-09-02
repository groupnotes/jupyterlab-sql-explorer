import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IEditorServices } from '@jupyterlab/codeeditor';

import { SqlWidget } from './SqlWidget';
import { sqlIcon } from './icons';
import { SqlModel } from './model';
import { IJpServices } from './JpServices';
import { askPasswd} from './components/ask_pass'
import { IPass} from './interfaces'

/**
 * Initialization data for the jupyterlab-sql-explorer extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-sql-explorer:plugin',
  autoStart: true,
  requires: [ILayoutRestorer, IEditorServices],
  optional: [ISettingRegistry, ITranslator],
  activate
};

function activate(
    app: JupyterFrontEnd, 
    restorer: ILayoutRestorer,
    editorService: IEditorServices,
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
    
    // Create the Git widget sidebar
    const model=new SqlModel()
    const sqlPlugin = new SqlWidget(model, jp_services);
    
    model.need_passwd.connect((_, pass_info:IPass)=>{
        askPasswd(pass_info, trans)
    })
        
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
